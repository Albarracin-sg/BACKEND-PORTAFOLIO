import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsPublicController } from './projects.public.controller';
import { ProjectsAdminController } from './projects.admin.controller';
import { GithubModule } from '../github/github.module';

@Module({
  imports: [GithubModule],
  controllers: [ProjectsPublicController, ProjectsAdminController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
