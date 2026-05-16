import { Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeHistogramProvider, makeGaugeProvider } from '@willsoto/nestjs-prometheus';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5],
    }),
    makeGaugeProvider({
      name: 'last_github_sync_timestamp',
      help: 'Unix timestamp of the last successful GitHub synchronization',
    }),
    makeGaugeProvider({
      name: 'database_connectivity_status',
      help: 'Status of the database connection (1 for UP, 0 for DOWN)',
    }),
    makeGaugeProvider({
      name: 'total_projects_count',
      help: 'Current total number of projects in the database (Durability metric)',
    }),
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
