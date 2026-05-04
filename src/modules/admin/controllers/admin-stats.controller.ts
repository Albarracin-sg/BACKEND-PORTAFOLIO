import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminStatsService } from '../services/admin-stats.service';

@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly statsService: AdminStatsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getStats() {
    return this.statsService.getStats();
  }
}