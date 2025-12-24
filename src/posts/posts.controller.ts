import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreatePostFormDto } from './dto/create-post-form.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { multerConfig } from './config/multer.config';
import { uploadImages } from 'src/helpers/file-upload.helper';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/auth/interfaces/valid-roles.interface';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user';
import { FilterPostsDto } from './dto/filter-posts.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  @UseInterceptors(FilesInterceptor('images', 10, multerConfig))
  async create(
    @Body() createPostFormDto: CreatePostFormDto,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user: User,
  ) {
    // Procesar las imágenes y obtener las URLs
    const imageUrls = await uploadImages(files);

    // Crear el DTO completo con las URLs de las imágenes
    const createPostDto: CreatePostDto = {
      ...createPostFormDto,
      images: imageUrls,
    };

    return this.postsService.create(createPostDto, user);
  }

  @Get()
  findAll(@Query() filterDto: FilterPostsDto) {
    return this.postsService.findAll(filterDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.update(id, updatePostDto);
  }

  @Delete(':id')
  @Auth(ValidRoles.ADMIN, ValidRoles.USER)
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.postsService.remove(id, user);
  }
}
