import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GithubService } from './github.service';

@ApiTags('public-github')
@Controller('public/github')
export class GithubPublicController {
  constructor(private readonly githubService: GithubService) {}

  @Get('stats')
  @Header('Cache-Control', 'no-store')
  getStats() {
    return this.githubService.getStats();
  }
}
