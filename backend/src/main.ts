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

  // ✅ CORS — ALLOWED_ORIGINS (comma-separated) + production domains + Vercel previews
  const rawOrigins =
    configService.get<string>('ALLOWED_ORIGINS') ?? 'http://localhost:3001';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const productionOrigins = ['https://jobnova.xyz', 'https://www.jobnova.xyz'];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (
        allowedOrigins.includes(origin) ||
        productionOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS: Origin "${origin}" not allowed`));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  });

  const port = process.env.PORT || 8080;
  await app.listen(Number(port), '0.0.0.0');

  console.log(`JobNova backend running on port ${port}`);
}
void bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
