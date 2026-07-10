import { Controller, Get, Header, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DiagramsService } from './diagrams.service';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';

@ApiTags('public-diagrams')
@Controller('public/projects/:projectId/diagrams')
export class DiagramsPublicController {
  constructor(private readonly diagramsService: DiagramsService) {}

  @Get()
  @RateLimit('diagrams')
  @UseGuards(RateLimitGuard)
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  listDiagrams(@Param('projectId') projectId: string) {
    return this.diagramsService.listPublicDiagrams(projectId);
  }
}
