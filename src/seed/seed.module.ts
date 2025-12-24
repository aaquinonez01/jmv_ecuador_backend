import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { AuthModule } from 'src/auth/auth.module';
import { User } from 'src/auth/entities/user';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post, PostImage } from 'src/posts/entities';
import { Scope } from 'src/category_post/entities/scope.entity';
import { Subtype } from 'src/category_post/entities/subtype.entity';
import { ActivityType } from 'src/category_post/entities/activity-type.entity';

@Module({
  controllers: [SeedController],
  providers: [SeedService],
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      User,
      Post,
      PostImage,
      Scope,
      Subtype,
      ActivityType,
    ]),
  ],
})
export class SeedModule {}
