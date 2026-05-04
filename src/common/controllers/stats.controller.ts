import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { RequestStatsService } from '../services/request-stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: RequestStatsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getStats() {
    return this.statsService.getStats();
  }
}