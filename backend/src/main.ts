import './instrument';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import * as express from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Read config via ConfigService — consistent, not process.env directly
  const configService = app.get(ConfigService);

  app.use(compression());

  // ✅ Helmet — sets secure HTTP headers (XSS, HSTS, clickjacking, etc.)
  app.use(helmet());

  app.use(express.json({ limit: '50kb' }));
  app.use(express.urlencoded({ extended: true, limit: '50kb' }));

  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ✅ Structured logging via Winston
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  // ✅ Global exception filter — normalizes all errors, no stack trace leaks
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ✅ CORS — origins from .env, supports multiple comma-separated values
  const rawOrigins =
    configService.get<string>('ALLOWED_ORIGINS') ?? 'http://localhost:3001';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow server-to-server requests (Postman, curl, internal services)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin "${origin}" not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  });

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
}
void bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
