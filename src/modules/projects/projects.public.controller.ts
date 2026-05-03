import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';

@ApiTags('public-projects')
@Controller('public/projects')
export class ProjectsPublicController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GitHub Webhook endpoint to sync projects on push' })
  async handleGithubWebhook() {
    // Aquí podrías validar la firma de GitHub por seguridad si quisieras (X-Hub-Signature-256)
    // Por ahora lo hacemos simple para que funcione al toque
    console.log('GitHub Webhook received! Syncing projects...');
    await this.projectsService.syncGithubProjects();
    return { message: 'Sync triggered successfully' };
  }
}
