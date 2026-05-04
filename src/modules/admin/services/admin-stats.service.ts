import { Injectable, Logger } from '@nestjs/common';

interface RequestLog {
  method: string;
  path: string;
  status: number;
  timestamp: number;
  responseTime: number;
}

interface EndpointStats {
  path: string;
  method: string;
  totalRequests: number;
  avgResponseTime: number;
}

@Injectable()
export class AdminStatsService {
  private readonly logger = new Logger(AdminStatsService.name);
  private readonly requests: RequestLog[] = [];
  private readonly maxRequests = 10000;

  /**
   * Record a request
   */
  recordRequest(method: string, path: string, status: number, responseTime: number) {
    const log: RequestLog = {
      method,
      path,
      status,
      timestamp: Date.now(),
      responseTime,
    };

    this.requests.push(log);

    if (this.requests.length > this.maxRequests) {
      this.requests.shift();
    }
  }

  /**
   * Get overall stats
   */
  getStats() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const fiveMinutesAgo = now - 300000;
    const oneHourAgo = now - 3600000;

    const recentRequests = this.requests.filter(r => r.timestamp > oneMinuteAgo);
    const recent5min = this.requests.filter(r => r.timestamp > fiveMinutesAgo);
    const recent1h = this.requests.filter(r => r.timestamp > oneHourAgo);

    const requestsPerMinute = recentRequests.length;

    const last100 = this.requests.slice(-100);
    const avgResponseTime = last100.length > 0
      ? last100.reduce((sum, r) => sum + r.responseTime, 0) / last100.length
      : 0;

    const endpointStats = this.getEndpointStats();

    return {
      totalRequests: this.requests.length,
      requestsPerMinute,
      requestsPer5Minutes: recent5min.length,
      requestsPerHour: recent1h.length,
      avgResponseTimeMs: Math.round(avgResponseTime),
      uptime: this.getUptime(),
      endpoints: endpointStats,
    };
  }

  /**
   * Get stats per endpoint
   */
  private getEndpointStats(): EndpointStats[] {
    const stats = new Map<string, EndpointStats>();

    for (const req of this.requests) {
      const key = `${req.method} ${req.path}`;
      
      if (!stats.has(key)) {
        stats.set(key, {
          path: req.path,
          method: req.method,
          totalRequests: 0,
          avgResponseTime: 0,
        });
      }

      const stat = stats.get(key)!;
      stat.totalRequests++;
    }

    for (const [key, stat] of stats) {
      const endpointRequests = this.requests.filter(
        r => `${r.method} ${r.path}` === key
      );
      const totalTime = endpointRequests.reduce((sum, r) => sum + r.responseTime, 0);
      stat.avgResponseTime = Math.round(totalTime / stat.totalRequests);
    }

    return Array.from(stats.values())
      .sort((a, b) => b.totalRequests - a.totalRequests);
  }

  /**
   * Get uptime estimate
   */
  private getUptime(): string {
    if (this.requests.length === 0) return '0s';
    
    const firstRequest = this.requests[0];
    const uptimeMs = Date.now() - firstRequest.timestamp;
    
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
   * Reset stats
   */
  reset() {
    this.requests.length = 0;
    this.logger.log('Stats reset');
  }
}