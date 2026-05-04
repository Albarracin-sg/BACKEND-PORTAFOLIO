import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

/**
 * Decorator para aplicar rate limiting usando variables de entorno.
 * 
 * Uso:
 * @RateLimit('spotify')  // Lee SPOTIFY_RATE_LIMIT_MAX_REQUESTS y SPOTIFY_RATE_LIMIT_WINDOW_MS
 * @RateLimit('bot')      // Lee BOT_RATE_LIMIT_MAX_REQUESTS y BOT_RATE_LIMIT_WINDOW_MS
 * @RateLimit('github')  // Lee GITHUB_RATE_LIMIT_MAX_REQUESTS y GITHUB_RATE_LIMIT_WINDOW_MS
 * @RateLimit('projects') // Lee PROJECTS_RATE_LIMIT_MAX_REQUESTS y PROJECTS_RATE_LIMIT_WINDOW_MS
 */
export const RateLimit = (key: string) => SetMetadata(RATE_LIMIT_KEY, key);