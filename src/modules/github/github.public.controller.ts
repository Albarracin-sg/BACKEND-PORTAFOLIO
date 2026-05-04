import { Controller, Get, Header, Ip, UseGuards } from '@nestjs/common';
import { GithubService } from './github.service';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';

@Controller('public/github')
@Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
export class GithubPublicController {
  constructor(private readonly githubService: GithubService) {}

  @Get('stats')
  @RateLimit({ limit: 20, windowMs: 60000 })
  @UseGuards(RateLimitGuard)
  getStats(@Ip() ip: string) {
    return this.githubService.getStats();
  }

  @Get('repos')
  @RateLimit({ limit: 30, windowMs: 60000 })
  @UseGuards(RateLimitGuard)
  getRepos(@Ip() ip: string) {
    return this.githubService.listRepos();
  }
}
}
