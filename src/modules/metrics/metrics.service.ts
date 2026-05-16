import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MetricsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    @InjectMetric('last_github_sync_timestamp') private readonly lastSyncGauge: Gauge<string>,
    @InjectMetric('database_connectivity_status') private readonly dbStatusGauge: Gauge<string>,
    @InjectMetric('total_projects_count') private readonly projectsCountGauge: Gauge<string>,
  ) {}

  onModuleInit() {
    this.updateBackgroundMetrics();
    // Actualizar métricas cada minuto
    setInterval(() => this.updateBackgroundMetrics(), 60000);
  }

  async updateBackgroundMetrics() {
    try {
      // 1. Durability: Conteo de proyectos
      const count = await this.prisma.project.count();
      this.projectsCountGauge.set(count);

      // 2. Availability: Salud de la DB
      await this.prisma.$queryRaw`SELECT 1`;
      this.dbStatusGauge.set(1);
    } catch (error) {
      this.dbStatusGauge.set(0);
    }
  }

  // 3. Freshness: Llamado desde el sync de GitHub
  recordGithubSyncSuccess() {
    this.lastSyncGauge.set(Math.floor(Date.now() / 1000));
  }
}
