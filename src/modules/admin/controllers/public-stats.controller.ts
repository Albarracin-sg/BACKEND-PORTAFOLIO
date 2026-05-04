import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminStatsService } from '../services/admin-stats.service';

@Controller('public/stats')
export class PublicStatsController {
  constructor(private readonly statsService: AdminStatsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getStats() {
    const fullStats = this.statsService.getStats();
    
    // Return only public-safe data (no IPs, no error details)
    return {
      totalRequests: fullStats.totalRequests,
      requestsPerMinute: fullStats.requestsPerMinute,
      avgResponseTimeMs: fullStats.avgResponseTimeMs,
      uptime: fullStats.uptime,
      endpoints: fullStats.endpoints.map(e => ({
        path: e.path,
        method: e.method,
        totalRequests: e.totalRequests,
        avgResponseTime: e.avgResponseTime,
      })),
      generatedAt: new Date().toISOString(),
    };
  }
}