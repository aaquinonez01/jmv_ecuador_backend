import { Module } from '@nestjs/common';
import { CategoryPostService } from './category_post.service';
import { CategoryPostController } from './category_post.controller';
import { Scope } from './entities/scope.entity';
import { ActivityType } from './entities/activity-type.entity';
import { Subtype } from './entities/subtype.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [CategoryPostController],
  providers: [CategoryPostService],
  imports: [TypeOrmModule.forFeature([Scope, ActivityType, Subtype])],
})
export class CategoryPostModule {}
