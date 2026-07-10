import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ContentGenerationService } from './content-generation.service';

@ApiTags('admin-content-generation')
@ApiBearerAuth()
@Controller('admin/content-generation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ContentGenerationController {
  constructor(
    private readonly contentGenerationService: ContentGenerationService,
  ) {}

  @Post('generate/:projectId')
  generateForProject(@Param('projectId') projectId: string) {
    return this.contentGenerationService.generateForProject(projectId);
  }

  @Post('generate-all')
  generateForAllMissing() {
    return this.contentGenerationService.generateForAllMissing();
  }
}
