import './instrument';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import * as express from 'express';
import { join } from 'path';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  // ✅ Read config via ConfigService — consistent, not process.env directly
  const configService = app.get(ConfigService);

  // Trust the first proxy hop so req.ip reflects the real client IP.
  // Required when deployed behind Nginx, Railway, Vercel, etc.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(compression());

  // ✅ Helmet — sets secure HTTP headers (XSS, HSTS, clickjacking, etc.)
  app.use(helmet());

  app.use(express.json({ limit: '50kb' }));
  app.use(express.urlencoded({ extended: true, limit: '50kb' }));

  // Serve uploaded CV files (PDF) as static assets
  app.use(
    '/uploads',
    express.static(join(process.cwd(), 'uploads'), {
      // Prevent directory listing
      index: false,
      // Only allow PDF downloads — block direct browser rendering
      setHeaders: (res) => {
        res.setHeader('Content-Disposition', 'attachment');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );

  app.useWebSocketAdapter(new IoAdapter(app));

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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('JobNova API')
    .setDescription('JobNova Recruitment Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('v1/docs', app, document);

  const port = process.env.PORT || 8080;
  await app.listen(Number(port), '0.0.0.0');

  console.log(`JobNova backend running on port ${port}`);
}
void bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
