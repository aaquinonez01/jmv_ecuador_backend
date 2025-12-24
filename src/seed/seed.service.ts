import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/auth/entities/user';
import { Repository } from 'typeorm';
import { usersData } from './data/users.data';
import { Post, PostImage } from 'src/posts/entities';
import { Scope } from 'src/category_post/entities/scope.entity';
import { Subtype } from 'src/category_post/entities/subtype.entity';
import { ActivityType } from 'src/category_post/entities/activity-type.entity';
import * as bcrypt from 'bcrypt';
@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostImage)
    private readonly postImageRepository: Repository<PostImage>,

    @InjectRepository(Scope)
    private readonly scopeRepository: Repository<Scope>,
    @InjectRepository(Subtype)
    private readonly subtypeRepository: Repository<Subtype>,
    @InjectRepository(ActivityType)
    private readonly activityTypeRepository: Repository<ActivityType>,
  ) {}
  private readonly logger = new Logger('SeedService');

  async executeSeed() {
    try {
      // await this.deleteTables();
      await this.insertUsers();
      return 'Seed executed successfully';
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private async deleteTables() {
    try {
      // Borrar en orden inverso a las dependencias
      await this.postImageRepository.clear();
      await this.postRepository.clear();
      await this.scopeRepository.clear();
      await this.activityTypeRepository.clear();
      await this.subtypeRepository.clear();
      await this.userRepository.clear();
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private async insertUsers() {
    const users: User[] = [];

    try {
      usersData.forEach((user) => {
        user.password = bcrypt.hashSync(user.password, 10);
        users.push(this.userRepository.create(user));
      });
      await this.userRepository.save(users);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: unknown) {
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Error al realizar la operación',
      error instanceof Error ? error.message : 'Error desconocido',
    );
  }
}
