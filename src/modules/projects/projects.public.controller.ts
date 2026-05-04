import { Controller, Get, Header, Param, Query, Ip, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';

@ApiTags('public-projects')
@Controller('public/projects')
export class ProjectsPublicController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RateLimit('projects')
  @UseGuards(RateLimitGuard)
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  listProjects(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('tech') tech?: string,
    @Query('sortBy') sortBy?: 'date' | 'stars' | 'name' | 'views',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Ip() ip?: string,
  ) {
    return this.projectsService.listPublicProjects({ search, category, tech, sortBy, sortOrder });
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  getProject(@Param('id') id: string) {
    return this.projectsService.getProject(id);
  }
}
