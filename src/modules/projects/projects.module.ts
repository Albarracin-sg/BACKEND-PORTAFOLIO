import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsPublicController } from './projects.public.controller';
import { ProjectsAdminController } from './projects.admin.controller';
import { GithubModule } from '../github/github.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [GithubModule, AiModule],
  controllers: [ProjectsPublicController, ProjectsAdminController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
