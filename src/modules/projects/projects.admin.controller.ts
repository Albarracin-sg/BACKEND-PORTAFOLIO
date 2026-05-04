import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@ApiTags('admin-projects')
@ApiBearerAuth()
@Controller('admin/projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ProjectsAdminController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  listProjects() {
    return this.projectsService.listAdminProjects();
  }

  @Post()
  createProject(@Body() body: CreateProjectDto) {
    return this.projectsService.createProject(body);
  }

  @Post('github-sync')
  syncGithubProjects() {
    return this.projectsService.syncGithubProjects();
  }

  @Put(':id')
  updateProject(@Param('id') id: string, @Body() body: UpdateProjectDto) {
    return this.projectsService.updateProject(id, body);
  }

  @Delete(':id')
  deleteProject(@Param('id') id: string) {
    return this.projectsService.deleteProject(id);
  }
}
