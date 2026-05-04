import { Module } from '@nestjs/common';
import { SpotifyPublicController } from './spotify.public.controller';
import { SpotifyService } from './spotify.service';

@Module({
  controllers: [SpotifyPublicController],
  providers: [SpotifyService],
  exports: [SpotifyService],
})
export class SpotifyModule {}
