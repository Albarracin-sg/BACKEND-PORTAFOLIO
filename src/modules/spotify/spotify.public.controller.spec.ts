import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { SpotifyPublicController } from './spotify.public.controller';
import { SPOTIFY_TRACK_TYPE, type SpotifyService } from './spotify.service';

describe('SpotifyPublicController', () => {
  it('delegates now playing requests to the service', async () => {
    const spotifyService: Pick<SpotifyService, 'getNowPlaying'> = {
      getNowPlaying: jest.fn().mockResolvedValue({
        type: SPOTIFY_TRACK_TYPE.NOW_PLAYING,
        name: 'Track',
        artists: 'Artist',
        url: 'https://spotify.com/track/1',
        album: 'Album',
        albumImageUrl: 'https://image',
        durationMs: 120000,
        progressMs: 1000,
      }),
    };

    const controller = new SpotifyPublicController(spotifyService as SpotifyService);

    await expect(controller.getNowPlaying()).resolves.toEqual({
      type: SPOTIFY_TRACK_TYPE.NOW_PLAYING,
      name: 'Track',
      artists: 'Artist',
      url: 'https://spotify.com/track/1',
      album: 'Album',
      albumImageUrl: 'https://image',
      durationMs: 120000,
      progressMs: 1000,
    });
    expect(spotifyService.getNowPlaying).toHaveBeenCalledTimes(1);
  });

  it('exposes the expected public route metadata', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SpotifyPublicController)).toBe('public/spotify');
    expect(Reflect.getMetadata(PATH_METADATA, SpotifyPublicController.prototype.getNowPlaying)).toBe(
      'now-playing',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, SpotifyPublicController.prototype.getNowPlaying)).toBe(
      RequestMethod.GET,
    );
  });
});
