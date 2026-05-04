import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestStatsService } from '../services/request-stats.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly statsService: RequestStatsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const ms = Date.now() - start;
      const status = res.statusCode;
      this.logger.log(`${method} ${originalUrl} ${status} - ${ms}ms`);
      
      // Record stats (exclude /bot/stats and /health endpoints)
      if (!originalUrl.includes('/bot/stats') && !originalUrl.includes('/health')) {
        this.statsService.recordRequest(method, originalUrl, status, ms);
      }
    });

    next();
  }
}
