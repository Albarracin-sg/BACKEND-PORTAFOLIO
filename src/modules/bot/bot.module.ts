import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotController } from './controllers/bot.controller';
import { BotAdminController } from './controllers/bot-admin.controller';
import { HuggingFaceService } from './services/huggingface.service';
import { GithubModule } from '../github/github.module';
import { ProjectsModule } from '../projects/projects.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [ConfigModule, GithubModule, ProjectsModule, AdminModule],
  controllers: [BotController, BotAdminController],
  providers: [HuggingFaceService],
  exports: [HuggingFaceService],
})
export class BotModule {}