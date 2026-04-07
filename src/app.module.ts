import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsModule } from './posts/posts.module';
import { CommonModule } from './common/common.module';
import { CategoryPostModule } from './category_post/category_post.module';
import { AuthModule } from './auth/auth.module';
import { SeedModule } from './seed/seed.module';
import { SiteImagesModule } from './site_images/site_images.module';
import { ActivityCategoriesModule } from './activity_categories/activity_categories.module';
import { ActivityPillarsModule } from './activity_pillars/activity_pillars.module';
import { ActivityTypesModule } from './activity_types/activity_types.module';
import { ActivitiesModule } from './activities/activities.module';
import { UpcomingActivitiesModule } from './upcoming_activities/upcoming_activities.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: parseInt(process.env.DATABASE_PORT ?? '5432'),
      username: process.env.DATABASE_USER ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres',
      database: process.env.DATABASE_NAME ?? 'jmv',
      autoLoadEntities: true,
      synchronize: true,
    }),
    PostsModule,
    CommonModule,
    CategoryPostModule,
    AuthModule,
    SeedModule,
    SiteImagesModule,
    ActivityCategoriesModule,
    ActivityPillarsModule,
    ActivityTypesModule,
    ActivitiesModule,
    UpcomingActivitiesModule,
    TestimonialsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
