import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AdminStatsService } from '../../modules/admin/services/admin-stats.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly statsService: AdminStatsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const ms = Date.now() - start;
      const status = res.statusCode;
      this.logger.log(`${method} ${originalUrl} ${status} - ${ms}ms`);
      
      // Record stats (exclude admin/stats and /health endpoints)
      if (!originalUrl.includes('/admin/stats') && !originalUrl.includes('/health')) {
        this.statsService.recordRequest(method, originalUrl, status, ms);
      }
    });

    next();
  }
}
