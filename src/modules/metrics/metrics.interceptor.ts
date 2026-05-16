import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total') private readonly counter: Counter<string>,
    @InjectMetric('http_request_duration_seconds') private readonly histogram: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.logMetrics(context, method, url, startTime),
        error: () => this.logMetrics(context, method, url, startTime),
      }),
    );
  }

  private logMetrics(context: ExecutionContext, method: string, url: string, startTime: number) {
    const response = context.switchToHttp().getResponse();
    const status = response.statusCode;
    const duration = (Date.now() - startTime) / 1000;

    // Normalizamos la URL para evitar cardinalidad infinita (sacamos IDs)
    const path = url.split('?')[0].replace(/[0-9a-fA-F-]{24,}/g, ':id');

    this.counter.inc({ method, path, status });
    this.histogram.observe({ method, path, status }, duration);
  }
}
