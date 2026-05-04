import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotController } from './controllers/bot.controller';
import { HuggingFaceService } from './services/huggingface.service';
import { GithubModule } from '../github/github.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ConfigModule, GithubModule, ProjectsModule],
  controllers: [BotController],
  providers: [HuggingFaceService],
  exports: [HuggingFaceService],
})
export class BotModule {}