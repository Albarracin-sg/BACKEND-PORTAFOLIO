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

  console.log('CORS_ORIGIN config:', env.CORS_ORIGIN);
  
  // Debug: allow all origins temporarily
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
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
    .setDescription(
`Backend REST API for the personal portfolio project. Built with NestJS, Prisma, and PostgreSQL.`,
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Protect /api/v1/docs with Basic Auth (MUST be before SwaggerModule.setup)
  const basicAuth = await import('basic-auth');
  const swaggerMiddleware = (req, res, next) => {
    const credentials = basicAuth.default(req);
    if (!credentials || credentials.name !== env.DOCS_USERNAME || credentials.pass !== env.DOCS_PASSWORD) {
      res.set('WWW-Authenticate', `Basic realm="User: ${env.DOCS_USERNAME} Pass: ${env.DOCS_PASSWORD}"`);
      return res.status(401).send('Access denied.');
    }
    next();
  };
  app.use('/api/v1/docs', swaggerMiddleware);
  app.use('/api/v1/docs-json', swaggerMiddleware);

  // SwaggerModule.setup does NOT inherit globalPrefix — must specify full path
  SwaggerModule.setup('api/v1/docs', app, document, { customSiteTitle: 'Portfolio API' });

  // Filter admin endpoints — only public routes visible in docs
  const allPaths = Object.keys(document.paths || {});
  for (const path of allPaths) {
    if (path.startsWith('/admin')) {
      delete document.paths[path];
    }
  }

  return env;
}

export async function createHttpApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const env = await configureApp(app);

  return { app, env };
}
