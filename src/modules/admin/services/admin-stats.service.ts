import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export const REQUEST_LOG_RETENTION_DAYS = 7;
export const REQUEST_LOG_RETENTION_MS = REQUEST_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const REQUEST_LOG_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
export const ADMIN_STATS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos en lugar de 15 segundos
const RECENT_REQUESTS_LIMIT = 50;
const TOP_ENDPOINTS_LIMIT = 20;

interface AdminStatsCache {
  value: Awaited<ReturnType<AdminStatsService['buildStatsSnapshot']>>;
  expiresAt: number;
}

export function formatDurationFromSeconds(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
}

function createDateBefore(referenceDate: Date, milliseconds: number): Date {
  return new Date(referenceDate.getTime() - milliseconds);
}

export interface EndpointStats {
  path: string;
  method: string;
  totalRequests: number;
  avgResponseTime: number;
}

@Injectable()
export class AdminStatsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminStatsService.name);
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private statsCache: AdminStatsCache | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.incrementRestartCount();
    await this.cleanupOldLogs();
    this.startCleanupSchedule();
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
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
    // Ignorar ruidos (endpoints que se llaman frecuentemente por polling)
    if (path.includes('spotify/now-playing') || path.includes('health')) {
      return;
    }

    // Fire-and-forget: No await para no bloquear la respuesta HTTP
    // Pero lo envolvemos para que si el pool está lleno, no ensucie el log gigante
    void this.prisma.requestLog.create({
      data: {
        method,
        path,
        status,
        responseTime,
        ip,
        userAgent,
      },
    }).catch((error) => {
      // Si es un error de pool de conexiones, logueamos algo corto una sola vez
      if (error.message.includes('connection pool')) {
        this.logger.warn(`⚠️ DB Connection Pool is full. Skipping request log for ${path}`);
      } else {
        this.logger.error(`Error recording request log: ${error.message.substring(0, 100)}...`);
      }
    });
  }

  /**
   * Get overall stats from DB
   */
  async getStats() {
    const now = new Date();
    const cachedStats = this.statsCache;

    if (cachedStats && cachedStats.expiresAt > now.getTime()) {
      return cachedStats.value;
    }

    const statsSnapshot = await this.buildStatsSnapshot(now);
    this.statsCache = {
      value: statsSnapshot,
      expiresAt: now.getTime() + ADMIN_STATS_CACHE_TTL_MS,
    };

    return statsSnapshot;
  }

  private async buildStatsSnapshot(now: Date) {
    const oneMinuteAgo = createDateBefore(now, 60 * 1000);
    const fiveMinutesAgo = createDateBefore(now, 5 * 60 * 1000);
    const oneHourAgo = createDateBefore(now, 60 * 60 * 1000);
    const retentionCutoff = createDateBefore(now, REQUEST_LOG_RETENTION_MS);

    const [
      [
        totalRequests,
        recentRequests,
        recent5min,
        recent1h,
        restartMetric,
        totalProjects,
        totalContactMessages,
        totalRateLimited,
      ],
      recentRequestsList,
      endpointStats,
    ] = await Promise.all([
      this.prisma.$transaction([
        this.prisma.requestLog.count(),
        this.prisma.requestLog.count({
          where: { timestamp: { gte: oneMinuteAgo } },
        }),
        this.prisma.requestLog.count({
          where: { timestamp: { gte: fiveMinutesAgo } },
        }),
        this.prisma.requestLog.count({
          where: { timestamp: { gte: oneHourAgo } },
        }),
        this.prisma.serverMetric.findUnique({
          where: { key: 'restart_count' },
          select: { value: true },
        }),
        this.prisma.project.count(),
        this.prisma.contactMessage.count(),
        this.prisma.requestLog.count({
          where: {
            status: 429,
            timestamp: { gte: retentionCutoff },
          },
        }),
      ]),
      this.prisma.requestLog.findMany({
        take: RECENT_REQUESTS_LIMIT,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          method: true,
          path: true,
          status: true,
          responseTime: true,
          ip: true,
          userAgent: true,
          timestamp: true,
        },
      }),
      this.getEndpointStats(retentionCutoff),
    ]);

    const avgResponseTime = recentRequestsList.length > 0
      ? recentRequestsList.reduce((sum, requestLog) => sum + requestLog.responseTime, 0) / recentRequestsList.length
      : 0;

    return {
      totalRequests,
      restartCount: restartMetric?.value ?? 0,
      totalProjects,
      totalContactMessages,
      totalRateLimited,
      requestsPerMinute: recentRequests,
      requestsPer5Minutes: recent5min,
      requestsPerHour: recent1h,
      avgResponseTimeMs: Math.round(avgResponseTime),
      uptime: this.getUptime(),
      endpoints: endpointStats,
      recentRequests: recentRequestsList,
    };
  }

  /**
   * Get stats per endpoint from DB
   */
  private async getEndpointStats(retentionCutoff: Date): Promise<EndpointStats[]> {
    try {
      const groupStats = await this.prisma.requestLog.groupBy({
        by: ['method', 'path'],
        where: {
          timestamp: { gte: retentionCutoff },
          // Excluir ruidos de la agregación visual
          NOT: [
            { path: { contains: 'spotify/now-playing' } },
            { path: { contains: 'health' } }
          ]
        },
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
        take: TOP_ENDPOINTS_LIMIT
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
   * Get uptime from the current server process
   */
  private getUptime(): string {
    return formatDurationFromSeconds(process.uptime());
  }

  /**
   * Reset stats (Danger: deletes all logs)
   */
  async reset() {
    await this.prisma.requestLog.deleteMany();
    this.clearStatsCache();
    this.logger.log('Stats reset in database');
  }

  private startCleanupSchedule() {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      void this.cleanupOldLogs();
    }, REQUEST_LOG_CLEANUP_INTERVAL_MS);

    this.cleanupInterval.unref?.();
  }

  private async cleanupOldLogs() {
    try {
      const retentionCutoff = createDateBefore(new Date(), REQUEST_LOG_RETENTION_MS);
      const deletedLogs = await this.prisma.requestLog.deleteMany({
        where: {
          timestamp: {
            lt: retentionCutoff,
          },
        },
      });

      if (deletedLogs.count > 0) {
        this.logger.log(`🧹 Cleaned ${deletedLogs.count} expired request logs`);
      }

      this.clearStatsCache();
    } catch (error) {
      this.logger.error(`Error cleaning expired request logs: ${error.message}`);
    }
  }

  private clearStatsCache() {
    this.statsCache = null;
  }
}
