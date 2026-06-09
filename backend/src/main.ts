import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: isProd
      ? (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000')
      : (origin, cb) => {
          if (!origin) return cb(null, true);
          const ok =
            /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
            /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
            /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin);
          return ok ? cb(null, true) : cb(new Error('CORS: origem não permitida'));
        },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api');

  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CliniCão API')
      .setDescription('API do sistema de gestão veterinária CliniCão')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const host = process.env.HOST ?? '0.0.0.0';
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, host);
}
bootstrap();
