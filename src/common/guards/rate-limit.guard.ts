import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const RATE_LIMIT_CONFIG: Record<string, { limitKey: string; windowKey: string }> = {
  spotify: { limitKey: 'SPOTIFY_RATE_LIMIT_MAX_REQUESTS', windowKey: 'SPOTIFY_RATE_LIMIT_WINDOW_MS' },
  github: { limitKey: 'GITHUB_RATE_LIMIT_MAX_REQUESTS', windowKey: 'GITHUB_RATE_LIMIT_WINDOW_MS' },
  projects: { limitKey: 'PROJECTS_RATE_LIMIT_MAX_REQUESTS', windowKey: 'PROJECTS_RATE_LIMIT_WINDOW_MS' },
  bot: { limitKey: 'BOT_RATE_LIMIT_MAX_REQUESTS', windowKey: 'BOT_RATE_LIMIT_WINDOW_MS' },
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly store = new Map<string, RateLimitEntry>();

  constructor(
    private reflector: Reflector,
    private config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const key = this.reflector.get<string>(RATE_LIMIT_KEY, context.getHandler());
    
    if (!key) {
      return true;
    }

    const config = RATE_LIMIT_CONFIG[key];
    if (!config) {
      return true;
    }

    const limit = this.config.get<number>(config.limitKey) || 30;
    const windowMs = this.config.get<number>(config.windowKey) || 60000;

    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const routeKey = `${ip}:${request.method}:${request.url}`;
    const now = Date.now();

    const entry = this.store.get(routeKey);

    if (!entry || entry.resetTime < now) {
      this.store.set(routeKey, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (entry.count >= limit) {
      throw new HttpException(
        `Too many requests. Limit: ${limit} per ${windowMs}ms`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    entry.count++;
    return true;
  }
}