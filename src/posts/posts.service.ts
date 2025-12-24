import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FilterPostsDto } from './dto/filter-posts.dto';
import { PostImage, Post } from './entities';
import { User } from 'src/auth/entities/user';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostImage)
    private readonly postImageRepository: Repository<PostImage>,
    private readonly dataSource: DataSource,
  ) {}

  private readonly logger = new Logger('PostsService');

  async create(createPostDto: CreatePostDto, user: User) {
    try {
      const { images = [], ...postData } = createPostDto;

      const post = this.postRepository.create({
        ...postData,
        images: images.map((image) =>
          this.postImageRepository.create({ url: image }),
        ),
        scope: postData.scope ? { id: postData.scope } : undefined,
        activityType: postData.activityType
          ? { id: postData.activityType }
          : undefined,
        subtype: postData.subtype ? { id: postData.subtype } : undefined,
        user,
      });
      await this.postRepository.save(post);
      return post;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll(filterDto: FilterPostsDto) {
    try {
      const {
        limit = 10,
        offset = 0,
        scope,
        activityType,
        subtype,
        typePost,
        search,
      } = filterDto;
      // Construir query dinámicamente con filtros
      const queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.images', 'images')
        .leftJoinAndSelect('post.user', 'user')
        .leftJoinAndSelect('post.scope', 'scope')
        .leftJoinAndSelect('post.activityType', 'activityType')
        .leftJoinAndSelect('post.subtype', 'subtype');

      // Aplicar filtros si existen
      if (scope) {
        queryBuilder.andWhere('scope.id = :scope', { scope });
      }

      if (activityType) {
        queryBuilder.andWhere('activityType.id = :activityType', {
          activityType,
        });
      }

      if (subtype) {
        queryBuilder.andWhere('subtype.id = :subtype', { subtype });
      }

      if (typePost) {
        queryBuilder.andWhere('post.typePost = :typePost', { typePost });
      }

      if (search) {
        queryBuilder.andWhere(
          '(post.title ILIKE :search OR post.content ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      // Ordenar por fecha de creación descendente
      queryBuilder.orderBy('post.createdAt', 'DESC');

      // Paginación
      queryBuilder.skip(offset).take(limit);

      const [posts, total] = await queryBuilder.getManyAndCount();

      const page = Math.floor(offset / limit) + 1;
      console.log('posts', posts);
      return {
        page,
        limit,
        offset,
        total,
        posts: posts.map((post) => ({
          id: post.id,
          title: post.title,
          content: post.content,
          typePost: post.typePost,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          images: post.images?.map((image) => image.url) || [],
          scope: post.scope
            ? { id: post.scope.id, name: post.scope.name }
            : null,
          activityType: post.activityType
            ? { id: post.activityType.id, name: post.activityType.name }
            : null,
          subtype: post.subtype
            ? { id: post.subtype.id, name: post.subtype.name }
            : null,
          user: {
            id: post.user.id,
            fullName: post.user.fullName,
            email: post.user.email,
            profilePicture: post.user.profilePicture,
            role: post.user.role,
          },
        })),
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findOne(id: string) {
    try {
      const post = await this.postRepository.findOneBy({ id });
      if (!post) {
        throw new NotFoundException('No se encontro el post especificado');
      }
      return {
        ...post,
        images: post.images?.map((image) => image.url),
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async update(id: string, updatePostDto: UpdatePostDto) {
    const { images, ...toUpdate } = updatePostDto;

    const post = await this.postRepository.preload({
      id,
      ...toUpdate,
      scope: toUpdate.scope ? { id: toUpdate.scope } : undefined,
      activityType: toUpdate.activityType
        ? { id: toUpdate.activityType }
        : undefined,
      subtype: toUpdate.subtype ? { id: toUpdate.subtype } : undefined,
    });
    if (!post) {
      throw new NotFoundException('No se encontro el post especificado');
    }

    //Create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        await queryRunner.manager.delete(PostImage, { post: { id } });
        post.images = images.map((image) =>
          this.postImageRepository.create({ url: image }),
        );
      }
      await queryRunner.manager.save(post);
      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.handleExceptions(error);
    }
  }

  async remove(id: string, user: User) {
    try {
      const post = await this.findOne(id);
      if (!post) {
        throw new NotFoundException('No se encontro el post especificado');
      }
      if (post.user.id !== user.id) {
        throw new ForbiddenException(
          'No tienes permisos para eliminar este post',
        );
      }
      await this.postRepository.remove(post as Post);
      return { message: 'Post eliminado correctamente' };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: any) {
    this.logger.error(error);
    throw new InternalServerErrorException('Error al realizar la operación');
  }
}
