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

  function buildTrackResponse(name: string, artists: string, type: string) {
    return {
      track: {
        type,
        name,
        artists,
        url: expect.any(String),
        album: expect.any(String),
        albumImageUrl: expect.any(String),
        durationMs: expect.any(Number),
        progressMs: expect.any(Number),
      },
      cached: expect.any(Boolean),
      stale: expect.any(Boolean),
      fetchedAt: expect.any(String),
      expiresAt: expect.any(String),
    };
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

    const result = await service.getNowPlaying();
    
    expect(result.track.type).toBe(SPOTIFY_TRACK_TYPE.NOW_PLAYING);
    expect(result.track.name).toBe('Saturno');
    expect(result.track.artists).toBe('Pablo, Luna');
    expect(result.track.url).toBe('https://spotify.com/track/1');
    expect(result.cached).toBe(true);
    expect(result.stale).toBe(false);
    expect(result.fetchedAt).toBeTruthy();
    expect(result.expiresAt).toBeTruthy();
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

    const result = await service.getNowPlaying();
    
    expect(result.track.type).toBe(SPOTIFY_TRACK_TYPE.RECENTLY_PLAYED);
    expect(result.track.name).toBe('Aurora');
    expect(result.track.artists).toBe('Nina');
  });

  it('returns a none payload when Spotify has no playable history', async () => {
    const service = createService();

    mockFetchOnce({ access_token: 'spotify-access-token' });
    jest.mocked(global.fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    mockFetchOnce({ items: [] });

    const result = await service.getNowPlaying();
    
    expect(result.track.type).toBe(SPOTIFY_TRACK_TYPE.NONE);
    expect(result.track.name).toBe('');
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

    // First call - cache miss, fetches from external
    const firstResult = await service.getNowPlaying();
    expect(firstResult.track.name).toBe('Cache Me');
    expect(global.fetch).toHaveBeenCalledTimes(2); // token + track
    
    // Second call - should use cache (no external calls)
    const secondResult = await service.getNowPlaying();
    expect(secondResult.track.name).toBe('Cache Me');
    expect(global.fetch).toHaveBeenCalledTimes(2); // still 2, no new calls
    
    // After TTL expires - should fetch again
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
    
    const thirdResult = await service.getNowPlaying();
    expect(thirdResult.track.name).toBe('Cache Miss');
    expect(global.fetch).toHaveBeenCalledTimes(4); // 2 more calls
  });
});