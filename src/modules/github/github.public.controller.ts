import { Controller, Get, Header, Ip, UseGuards } from '@nestjs/common';
import { GithubService } from './github.service';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';

@Controller('public/github')
export class GithubPublicController {
  constructor(private readonly githubService: GithubService) {}

  @Get('stats')
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  @RateLimit('github')
  @UseGuards(RateLimitGuard)
  getStats(@Ip() ip: string) {
    return this.githubService.getStats();
  }

  @Get('repos')
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  @RateLimit('github')
  @UseGuards(RateLimitGuard)
  getRepos(@Ip() ip: string) {
    return this.githubService.listRepos();
  }
}
