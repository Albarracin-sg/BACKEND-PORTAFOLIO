import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { validateEnv } from './config/env.schema';

function getUploadsPath() {
  if (process.env.VERCEL) {
    return join('/tmp', 'uploads');
  }

  return join(process.cwd(), 'uploads');
}

export async function configureApp(app: NestExpressApplication) {
  const env = validateEnv(process.env);

  app.disable('etag');

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter({ httpAdapter } as never));

  const uploadsPath = getUploadsPath();
  mkdirSync(uploadsPath, { recursive: true });
  app.useStaticAssets(uploadsPath, { prefix: '/uploads' });

  app.setGlobalPrefix('api/v1');

  const corsOrigin =
    env.CORS_ORIGIN === '*'
      ? true
      : env.CORS_ORIGIN.split(',').map((item) => item.trim());

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Portfolio API')
    .setDescription('Public and admin endpoints for the portfolio CMS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, document);

  return env;
}

export async function createHttpApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const env = await configureApp(app);

  return { app, env };
}
