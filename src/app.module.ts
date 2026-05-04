import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContentModule } from './modules/content/content.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ContactModule } from './modules/contact/contact.module';
import { MediaModule } from './modules/media/media.module';
import { GithubModule } from './modules/github/github.module';
import { MailModule } from './modules/mail/mail.module';
import { SpotifyModule } from './modules/spotify/spotify.module';
import { BotModule } from './modules/bot/bot.module';
import { AdminModule } from './modules/admin/admin.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

import { validateEnv } from './config/env.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    ContentModule,
    ProjectsModule,
    ContactModule,
    MediaModule,
    GithubModule,
    SpotifyModule,
    MailModule,
    BotModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
