import { Module } from '@nestjs/common';
import { ContentGenerationController } from './content-generation.controller';
import { ContentGenerationService } from './content-generation.service';
import { AiModule } from '../ai/ai.module';
import { GithubModule } from '../github/github.module';
import { BlogModule } from '../blog/blog.module';
import { DiagramsModule } from '../diagrams/diagrams.module';

@Module({
  imports: [AiModule, GithubModule, BlogModule, DiagramsModule],
  controllers: [ContentGenerationController],
  providers: [ContentGenerationService],
  exports: [ContentGenerationService],
})
export class ContentGenerationModule {}
