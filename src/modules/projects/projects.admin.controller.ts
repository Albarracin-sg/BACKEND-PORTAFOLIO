import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProjectsService } from './projects.service';
import { ContentGenerationService } from '../content-generation/content-generation.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@ApiTags('admin-projects')
@ApiBearerAuth()
@Controller('admin/projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ProjectsAdminController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly contentGenerationService: ContentGenerationService,
  ) {}

  @Get()
  listProjects() {
    return this.projectsService.listAdminProjects();
  }

  @Post()
  createProject(@Body() body: CreateProjectDto) {
    return this.projectsService.createProject(body);
  }

  @Post('github-sync')
  async syncGithubProjects() {
    const syncResult = await this.projectsService.syncGithubProjects();

    // After sync, generate diagrams + articles for projects missing them
    const contentResults = await this.contentGenerationService.generateForAllMissing();

    return {
      ...syncResult,
      contentGenerated: contentResults.length,
      contentResults,
    };
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
