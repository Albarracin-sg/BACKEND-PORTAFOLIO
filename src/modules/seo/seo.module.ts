import { Module } from '@nestjs/common';
import { SeoController } from './seo.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SeoController],
})
export class SeoModule {}
