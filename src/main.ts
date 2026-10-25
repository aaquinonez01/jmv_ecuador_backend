import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Detrás de Nginx Proxy Manager: usar X-Forwarded-For para la IP real
  app.set('trust proxy', 1);
  app.enableShutdownHooks();

  // Configurar Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  app.use(compression());
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.setGlobalPrefix('api');

  // CORS: solo permitir tus dominios de producción
  app.enableCors({
    origin: [
      'https://jmvecuador.org',
      'https://www.jmvecuador.org',
      'http://localhost:3000', // para que sigas pudiendo probar en local
      // En desarrollo, cualquier puerto de localhost
      ...(process.env.NODE_ENV === 'production'
        ? []
        : [/^http:\/\/(localhost|127\.0\.0\.1):\d+$/]),
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      // El lector PDF de la biblioteca pide el archivo por partes
      'Range',
      'If-Range',
      'If-None-Match',
      'If-Modified-Since',
    ],
    exposedHeaders: [
      'Accept-Ranges',
      'Content-Range',
      'Content-Length',
      'Content-Disposition',
      'ETag',
    ],
    credentials: true,
  });

  // whitelist: descarta propiedades no declaradas en los DTOs (evita
  // asignación masiva de campos como role/isActive)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3002);
}
void bootstrap();
