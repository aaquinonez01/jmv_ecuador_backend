import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Post, PostImage } from './entities';
import { AuthModule } from 'src/auth/auth.module';
import { Scope } from 'src/category_post/entities/scope.entity';
import { ActivityType } from 'src/category_post/entities/activity-type.entity';
import { Subtype } from 'src/category_post/entities/subtype.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, PostImage, Scope, ActivityType, Subtype]),
    AuthModule,
  ],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
