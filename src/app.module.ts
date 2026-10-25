import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { ZonasModule } from './zonas/zonas.module';
import { ComunidadesModule } from './comunidades/comunidades.module';
import { QuizModule } from './quiz/quiz.module';
import { ConsejoNacionalModule } from './consejo_nacional/consejo-nacional.module';
import { AsesoresModule } from './asesores/asesores.module';
import { HomeAnnouncementsModule } from './home_announcements/home-announcements.module';
import { ContactMessagesModule } from './contact_messages/contact-messages.module';
import { CalendarDatesModule } from './calendar_dates/calendar-dates.module';
import { LibraryModule } from './library/library.module';
import { StatutesModule } from './statutes/statutes.module';
import { DonationsModule } from './donations/donations.module';
@Module({
  imports: [
    ConfigModule.forRoot(),
    // Solo se aplica en las rutas con RealIpThrottlerGuard (login, registro,
    // contacto y recuperación de contraseña)
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 10 }],
      errorMessage:
        'Hiciste demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: parseInt(process.env.DATABASE_PORT ?? '5432'),
      username: process.env.DATABASE_USER ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres',
      database: process.env.DATABASE_NAME ?? 'jmv',
      autoLoadEntities: true,
      // En producción solo con DB_SYNCHRONIZE=true (p. ej. el primer arranque
      // con la base vacía, para crear las tablas). Luego volver a false.
      synchronize:
        process.env.NODE_ENV !== 'production' ||
        process.env.DB_SYNCHRONIZE === 'true',
      logging: ['error', 'warn'],
      maxQueryExecutionTime: 1000,
      extra: {
        max: 15,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
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
    ZonasModule,
    ComunidadesModule,
    QuizModule,
    ConsejoNacionalModule,
    AsesoresModule,
    HomeAnnouncementsModule,
    ContactMessagesModule,
    CalendarDatesModule,
    LibraryModule,
    StatutesModule,
    DonationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
