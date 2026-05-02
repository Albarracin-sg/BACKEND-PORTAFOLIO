import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SpotifyService } from './spotify.service';

@ApiTags('public-spotify')
@Controller('public/spotify')
export class SpotifyPublicController {
  constructor(private readonly spotifyService: SpotifyService) {}

  @Get('now-playing')
  @Header('Cache-Control', 'no-store')
  getNowPlaying() {
    return this.spotifyService.getNowPlaying();
  }
}
