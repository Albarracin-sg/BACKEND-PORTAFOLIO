import { ConfigService } from '@nestjs/config';
import { SpotifyService, SPOTIFY_TRACK_TYPE } from './spotify.service';

describe('SpotifyService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function createService() {
    return new SpotifyService(
      new ConfigService({
        SPOTIFY_CLIENT_ID: 'client-id',
        SPOTIFY_CLIENT_SECRET: 'client-secret',
        SPOTIFY_REFRESH_TOKEN: 'refresh-token',
      }),
    );
  }

  function mockFetchOnce(body: unknown, status = 200) {
    const response = new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

    jest.mocked(global.fetch).mockResolvedValueOnce(response);
  }

  it('refreshes the Spotify access token', async () => {
    const service = createService();

    mockFetchOnce({ access_token: 'spotify-access-token' });

    await expect(service.refreshAccessToken()).resolves.toBe('spotify-access-token');

    expect(global.fetch).toHaveBeenCalledWith('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from('client-id:client-secret').toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=refresh_token&refresh_token=refresh-token',
    });
  });

  it('returns the current track when Spotify has something playing', async () => {
    const service = createService();

    mockFetchOnce({ access_token: 'spotify-access-token' });
    mockFetchOnce({
      is_playing: true,
      progress_ms: 54321,
      item: {
        name: 'Saturno',
        external_urls: { spotify: 'https://spotify.com/track/1' },
        album: {
          name: 'Universo',
          images: [{ url: 'https://img/album.jpg' }],
        },
        artists: [{ name: 'Pablo' }, { name: 'Luna' }],
        duration_ms: 210000,
      },
    });

    await expect(service.getNowPlaying()).resolves.toEqual({
      type: SPOTIFY_TRACK_TYPE.NOW_PLAYING,
      name: 'Saturno',
      artists: 'Pablo, Luna',
      url: 'https://spotify.com/track/1',
      album: 'Universo',
      albumImageUrl: 'https://img/album.jpg',
      durationMs: 210000,
      progressMs: 54321,
    });
  });

  it('falls back to the most recent track when nothing is currently playing', async () => {
    const service = createService();

    mockFetchOnce({ access_token: 'spotify-access-token' });
    jest.mocked(global.fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    mockFetchOnce({
      items: [
        {
          track: {
            name: 'Aurora',
            external_urls: { spotify: 'https://spotify.com/track/2' },
            album: {
              name: 'Cielo',
              images: [{ url: 'https://img/recent.jpg' }],
            },
            artists: [{ name: 'Nina' }],
            duration_ms: 180000,
          },
        },
      ],
    });

    await expect(service.getNowPlaying()).resolves.toEqual({
      type: SPOTIFY_TRACK_TYPE.RECENTLY_PLAYED,
      name: 'Aurora',
      artists: 'Nina',
      url: 'https://spotify.com/track/2',
      album: 'Cielo',
      albumImageUrl: 'https://img/recent.jpg',
      durationMs: 180000,
      progressMs: 0,
    });
  });

  it('returns a none payload when Spotify has no playable history', async () => {
    const service = createService();

    mockFetchOnce({ access_token: 'spotify-access-token' });
    jest.mocked(global.fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    mockFetchOnce({ items: [] });

    await expect(service.getNowPlaying()).resolves.toEqual({
      type: SPOTIFY_TRACK_TYPE.NONE,
      name: '',
      artists: '',
      url: '',
      album: '',
      albumImageUrl: '',
      durationMs: 0,
      progressMs: 0,
    });
  });

  it('caches the now playing payload for thirty seconds', async () => {
    const service = createService();

    mockFetchOnce({ access_token: 'spotify-access-token' });
    mockFetchOnce({
      is_playing: true,
      progress_ms: 1000,
      item: {
        name: 'Cache Me',
        external_urls: { spotify: 'https://spotify.com/track/3' },
        album: {
          name: 'Memo',
          images: [{ url: 'https://img/cache.jpg' }],
        },
        artists: [{ name: 'DJ Cache' }],
        duration_ms: 99999,
      },
    });

    const firstResult = await service.getNowPlaying();
    const secondResult = await service.getNowPlaying();

    expect(secondResult).toEqual(firstResult);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(30001);

    mockFetchOnce({ access_token: 'spotify-access-token-2' });
    mockFetchOnce({
      is_playing: true,
      progress_ms: 2000,
      item: {
        name: 'Cache Miss',
        external_urls: { spotify: 'https://spotify.com/track/4' },
        album: {
          name: 'Memo 2',
          images: [{ url: 'https://img/cache-2.jpg' }],
        },
        artists: [{ name: 'DJ Refresh' }],
        duration_ms: 111111,
      },
    });

    await expect(service.getNowPlaying()).resolves.toEqual({
      type: SPOTIFY_TRACK_TYPE.NOW_PLAYING,
      name: 'Cache Miss',
      artists: 'DJ Refresh',
      url: 'https://spotify.com/track/4',
      album: 'Memo 2',
      albumImageUrl: 'https://img/cache-2.jpg',
      durationMs: 111111,
      progressMs: 2000,
    });
  });
});
