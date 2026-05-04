import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AdminStatsService } from '../../modules/admin/services/admin-stats.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly statsService: AdminStatsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const start = Date.now();

    res.on('finish', () => {
      const ms = Date.now() - start;
      const status = res.statusCode;
      this.logger.log(`${method} ${originalUrl} ${status} - ${ms}ms [${ip}]`);
      
      // Record stats (exclude admin/stats, /health and media endpoints to avoid noise)
      if (
        !originalUrl.includes('/admin/stats') && 
        !originalUrl.includes('/health') &&
        !originalUrl.includes('/media/')
      ) {
        this.statsService.recordRequest(
          method, 
          originalUrl, 
          status, 
          ms, 
          Array.isArray(ip) ? ip[0] : String(ip), 
          String(userAgent)
        );
      }
    });

    next();
  }
}
