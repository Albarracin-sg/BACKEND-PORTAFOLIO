import { Module } from '@nestjs/common';
import { AdminStatsController } from './controllers/admin-stats.controller';
import { PublicStatsController } from './controllers/public-stats.controller';
import { AdminStatsService } from './services/admin-stats.service';

@Module({
  controllers: [AdminStatsController, PublicStatsController],
  providers: [AdminStatsService],
  exports: [AdminStatsService],
})
export class AdminModule {}