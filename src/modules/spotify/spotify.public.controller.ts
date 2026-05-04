import { Controller, Get, Header, Ip, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SpotifyService } from './spotify.service';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';

@ApiTags('public-spotify')
@Controller('public/spotify')
export class SpotifyPublicController {
  constructor(private readonly spotifyService: SpotifyService) {}

  @Get('now-playing')
  @RateLimit({ limit: 30, windowMs: 60000 })
  @UseGuards(RateLimitGuard)
  @Header('Cache-Control', 'public, max-age=15, stale-while-revalidate=30')
  getNowPlaying(@Ip() ip: string) {
    return this.spotifyService.getNowPlaying();
  }
}