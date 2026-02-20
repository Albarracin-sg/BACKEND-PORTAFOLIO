import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';

@ApiTags('public-projects')
@Controller('public/projects')
export class ProjectsPublicController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  listProjects(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('tech') tech?: string,
    @Query('sortBy') sortBy?: 'date' | 'stars' | 'name' | 'views',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.projectsService.listPublicProjects({ search, category, tech, sortBy, sortOrder });
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  getProject(@Param('id') id: string) {
    return this.projectsService.getProject(id);
  }
}
