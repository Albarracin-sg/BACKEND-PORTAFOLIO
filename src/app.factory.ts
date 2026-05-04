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
    origin: true, // Allow all for debugging
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
    .setDescription(
`Backend REST API for the personal portfolio project.

**Features:**
• Content Management (pages, sections) with live editing
• Project showcase with GitHub sync integration
• Real-time Spotify now-playing status
• AI-powered chatbot via HuggingFace
• Contact form with email notifications
• Media upload and management

**Authentication:**
Most admin endpoints require a JWT Bearer token. Use the \`POST /auth/login\` endpoint to authenticate.

**Demo Credentials:**
**Email:** \`admin@portfolio.dev\`
**Password:** \`admin123\`

Log in and paste the returned token into the 🔓 **Authorize** button above.

**⚠️ Demo Environment:**
This is a public demo. Authenticated users have direct access to the database through the API. Feel free to create, update, and delete content — it's a portfolio, not production.

**Rate Limiting:**
All public endpoints have rate limiting configured per endpoint type.

---
Built with NestJS, Prisma, and PostgreSQL.`,
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { customSiteTitle: 'Portfolio API' });

  return env;
}

export async function createHttpApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const env = await configureApp(app);

  return { app, env };
}
