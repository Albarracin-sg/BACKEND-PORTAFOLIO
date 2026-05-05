import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface EndpointStats {
  path: string;
  method: string;
  totalRequests: number;
  avgResponseTime: number;
}

@Injectable()
export class AdminStatsService implements OnModuleInit {
  private readonly logger = new Logger(AdminStatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.incrementRestartCount();
  }

  /**
   * Increment the server restart counter in DB
   */
  private async incrementRestartCount() {
    try {
      await this.prisma.serverMetric.upsert({
        where: { key: 'restart_count' },
        update: { value: { increment: 1 } },
        create: { key: 'restart_count', value: 1 },
      });
      this.logger.log('🚀 Server restart recorded');
    } catch (error) {
      this.logger.error(`Error incrementing restart count: ${error.message}`);
    }
  }

  /**
   * Get restart count from DB
   */
  private async getRestartCount(): Promise<number> {
    const metric = await this.prisma.serverMetric.findUnique({
      where: { key: 'restart_count' }
    });
    return metric?.value || 0;
  }

  /**
   * Record a request in the database
   */
  async recordRequest(method: string, path: string, status: number, responseTime: number, ip?: string, userAgent?: string) {
    try {
      await this.prisma.requestLog.create({
        data: {
          method,
          path,
          status,
          responseTime,
          ip,
          userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Error recording request log: ${error.message}`);
    }
  }

  /**
   * Get overall stats from DB
   */
  async getStats() {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const fiveMinutesAgo = new Date(now.getTime() - 300000);
    const oneHourAgo = new Date(now.getTime() - 3600000);

    const [
      totalRequests,
      recentRequests,
      recent5min,
      recent1h,
      last100,
      restartCount,
      totalProjects,
      totalContactMessages,
    ] = await Promise.all([
      this.prisma.requestLog.count(),
      this.prisma.requestLog.count({ where: { timestamp: { gte: oneMinuteAgo } } }),
      this.prisma.requestLog.count({ where: { timestamp: { gte: fiveMinutesAgo } } }),
      this.prisma.requestLog.count({ where: { timestamp: { gte: oneHourAgo } } }),
      this.prisma.requestLog.findMany({
        take: 100,
        orderBy: { timestamp: 'desc' },
        select: { responseTime: true }
      }),
      this.getRestartCount(),
      this.prisma.project.count(),
      this.prisma.contactMessage.count(),
    ]);

    const avgResponseTime = last100.length > 0
      ? last100.reduce((sum, r) => sum + r.responseTime, 0) / last100.length
      : 0;

    const endpointStats = await this.getEndpointStats();

    return {
      totalRequests,
      restartCount,
      totalProjects,
      totalContactMessages,
      requestsPerMinute: recentRequests,
      requestsPer5Minutes: recent5min,
      requestsPerHour: recent1h,
      avgResponseTimeMs: Math.round(avgResponseTime),
      uptime: await this.getUptime(),
      endpoints: endpointStats,
    };
  }

  /**
   * Get stats per endpoint from DB
   */
  private async getEndpointStats(): Promise<EndpointStats[]> {
    try {
      const groupStats = await this.prisma.requestLog.groupBy({
        by: ['method', 'path'],
        _count: {
          id: true
        },
        _avg: {
          responseTime: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 20
      });

      return groupStats.map(stat => ({
        path: stat.path,
        method: stat.method,
        totalRequests: stat._count?.id || 0,
        avgResponseTime: Math.round(stat._avg?.responseTime || 0)
      }));
    } catch (error) {
      this.logger.error(`Error fetching endpoint stats: ${error.message}`);
      return [];
    }
  }

  /**
   * Get uptime estimate (from first recorded request)
   */
  private async getUptime(): Promise<string> {
    const firstRequest = await this.prisma.requestLog.findFirst({
      orderBy: { timestamp: 'asc' }
    });

    if (!firstRequest) return '0s';
    
    const uptimeMs = Date.now() - firstRequest.timestamp.getTime();
    
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Reset stats (Danger: deletes all logs)
   */
  async reset() {
    await this.prisma.requestLog.deleteMany();
    this.logger.log('Stats reset in database');
  }
}