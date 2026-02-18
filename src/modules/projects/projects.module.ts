import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsPublicController } from './projects.public.controller';
import { ProjectsAdminController } from './projects.admin.controller';

@Module({
  controllers: [ProjectsPublicController, ProjectsAdminController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
