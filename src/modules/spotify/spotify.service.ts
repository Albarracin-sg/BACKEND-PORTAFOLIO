import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const SPOTIFY_TRACK_TYPE = {
  NOW_PLAYING: 'now_playing',
  RECENTLY_PLAYED: 'recently_played',
  NONE: 'none',
} as const;

export type SpotifyTrackType = (typeof SPOTIFY_TRACK_TYPE)[keyof typeof SPOTIFY_TRACK_TYPE];

export interface SpotifyTrack {
  type: SpotifyTrackType;
  name: string;
  artists: string;
  url: string;
  album: string;
  albumImageUrl: string;
  durationMs: number;
  progressMs: number;
}

export interface SpotifyResponse {
  track: SpotifyTrack;
  cached: boolean;
  stale: boolean;
  fetchedAt: string | null;
  expiresAt: string | null;
}

interface SpotifyTokenResponse {
  access_token: string;
}

interface SpotifyExternalUrls {
  spotify?: string;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyImage {
  url: string;
}

interface SpotifyAlbum {
  name: string;
  images: SpotifyImage[];
}

interface SpotifyTrackItem {
  name: string;
  external_urls: SpotifyExternalUrls;
  album: SpotifyAlbum;
  artists: SpotifyArtist[];
  duration_ms: number;
}

interface SpotifyCurrentlyPlayingResponse {
  progress_ms: number | null;
  item: SpotifyTrackItem | null;
}

interface SpotifyRecentTrackItem {
  track: SpotifyTrackItem;
}

interface SpotifyRecentlyPlayedResponse {
  items: SpotifyRecentTrackItem[];
}

interface SpotifyCacheEntry {
  value: SpotifyTrack;
  expiresAt: number;
  fetchedAt: number;
}

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);
  
  private cache: SpotifyCacheEntry | null = null;
  private inFlightRequest: Promise<SpotifyResponse> | null = null;
  private lastError: string | null = null;

  constructor(private readonly config: ConfigService) {}

  private getCacheTtlMs(): number {
    return this.config.get<number>('SPOTIFY_CACHE_TTL_MS') || 30000;
  }

  async getNowPlaying(): Promise<SpotifyResponse> {
    const cacheTtl = this.getCacheTtlMs();
    const now = Date.now();

    // Cache válido - devolver directamente
    if (this.cache && this.cache.expiresAt > now) {
      this.logger.log('📦 Spotify cache hit');
      return this.buildResponse(this.cache.value, false, false, this.cache.fetchedAt, this.cache.expiresAt);
    }

    // Hay request en progreso - esperar esa misma promesa
    if (this.inFlightRequest) {
      this.logger.log('⏳ Spotify waiting for in-flight request');
      return this.inFlightRequest;
    }

    // Crear nueva request con protección contra cache stampede
    this.inFlightRequest = this.fetchSpotifyWithFallback(cacheTtl, now);
    
    try {
      return await this.inFlightRequest;
    } finally {
      this.inFlightRequest = null;
    }
  }

  private async fetchSpotifyWithFallback(cacheTtl: number, now: number): Promise<SpotifyResponse> {
    try {
      // Llamada a Spotify
      const startTime = Date.now();
      const accessToken = await this.refreshAccessToken();
      const currentTrack = await this.tryGetCurrentTrack(accessToken);
      const recentTrack = currentTrack ? null : await this.tryGetRecentTrack(accessToken);
      const track = currentTrack ?? recentTrack ?? this.createEmptyTrack();
      
      const duration = Date.now() - startTime;
      this.logger.log(`🌐 Spotify external request: ${duration}ms`);
      
      // Guardar en cache
      this.cache = {
        value: track,
        expiresAt: now + cacheTtl,
        fetchedAt: now,
      };
      this.lastError = null;

      return this.buildResponse(track, true, false, now, now + cacheTtl);
      
    } catch (error) {
      const sanitizedError = this.sanitizeError(error);
      this.logger.warn(`⚠️ Spotify error: ${sanitizedError}`);
      this.lastError = sanitizedError;

      // Si hay cache stale, devolverlo
      if (this.cache) {
        this.logger.log('♻️ Fallback to stale cache');
        return this.buildResponse(
          this.cache.value, 
          true, 
          true, 
          this.cache.fetchedAt, 
          this.cache.expiresAt
        );
      }

      // No hay cache - devolver error controlado
      throw new HttpException(
        `Spotify unavailable: ${sanitizedError}`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  private buildResponse(
    track: SpotifyTrack, 
    cached: boolean, 
    stale: boolean,
    fetchedAt: number | null,
    expiresAt: number | null
  ): SpotifyResponse {
    return {
      track,
      cached,
      stale,
      fetchedAt: fetchedAt ? new Date(fetchedAt).toISOString() : null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    };
  }

  private sanitizeError(error: unknown): string {
    if (error instanceof Error) {
      // No exponer detalles sensibles
      if (error.message.includes('status 401')) return 'Token expired';
      if (error.message.includes('status 403')) return 'Access forbidden';
      if (error.message.includes('status 429')) return 'Rate limited';
      if (error.message.includes('status 5')) return 'Spotify server error';
      return 'Spotify error';
    }
    return 'Unknown error';
  }

  async refreshAccessToken(): Promise<string> {
    const clientId = this.getRequiredEnv('SPOTIFY_CLIENT_ID');
    const clientSecret = this.getRequiredEnv('SPOTIFY_CLIENT_SECRET');
    const refreshToken = this.getRequiredEnv('SPOTIFY_REFRESH_TOKEN');
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
    });

    if (!response.ok) {
      throw new Error(`Spotify token refresh failed with status ${response.status}`);
    }

    const payload = (await response.json()) as SpotifyTokenResponse;

    if (!payload.access_token) {
      throw new Error('Spotify token refresh response did not include an access token');
    }

    return payload.access_token;
  }

  async getCurrentlyPlaying(accessToken: string): Promise<SpotifyTrack | null> {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: this.getSpotifyHeaders(accessToken),
    });

    if (response.status === 204 || response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Spotify currently playing failed with status ${response.status}`);
    }

    const payload = (await response.json()) as SpotifyCurrentlyPlayingResponse;
    if (!payload.item) {
      return null;
    }

    return this.mapTrack(payload.item, SPOTIFY_TRACK_TYPE.NOW_PLAYING, payload.progress_ms ?? 0);
  }

  async getRecentlyPlayed(accessToken: string): Promise<SpotifyTrack | null> {
    const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
      headers: this.getSpotifyHeaders(accessToken),
    });

    if (!response.ok) {
      throw new Error(`Spotify recently played failed with status ${response.status}`);
    }

    const payload = (await response.json()) as SpotifyRecentlyPlayedResponse;
    const recentTrack = payload.items[0]?.track;

    if (!recentTrack) {
      return null;
    }

    return this.mapTrack(recentTrack, SPOTIFY_TRACK_TYPE.RECENTLY_PLAYED, 0);
  }

  private getRequiredEnv(key: 'SPOTIFY_CLIENT_ID' | 'SPOTIFY_CLIENT_SECRET' | 'SPOTIFY_REFRESH_TOKEN') {
    const value = this.config.get<string>(key);

    if (!value) {
      throw new Error(`Missing required Spotify environment variable: ${key}`);
    }

    return value;
  }

  private getSpotifyHeaders(accessToken: string) {
    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }

  private async tryGetCurrentTrack(accessToken: string) {
    try {
      return await this.getCurrentlyPlaying(accessToken);
    } catch {
      return null;
    }
  }

  private async tryGetRecentTrack(accessToken: string) {
    try {
      return await this.getRecentlyPlayed(accessToken);
    } catch {
      return null;
    }
  }

  private mapTrack(track: SpotifyTrackItem, type: SpotifyTrackType, progressMs: number): SpotifyTrack {
    return {
      type,
      name: track.name,
      artists: track.artists.map((artist) => artist.name).join(', '),
      url: track.external_urls.spotify ?? '',
      album: track.album.name,
      albumImageUrl: track.album.images[0]?.url ?? '',
      durationMs: track.duration_ms,
      progressMs,
    };
  }

  private createEmptyTrack(): SpotifyTrack {
    return {
      type: SPOTIFY_TRACK_TYPE.NONE,
      name: '',
      artists: '',
      url: '',
      album: '',
      albumImageUrl: '',
      durationMs: 0,
      progressMs: 0,
    };
  }
}