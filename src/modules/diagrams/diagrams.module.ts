import { Module } from '@nestjs/common';
import { DiagramsService } from './diagrams.service';
import { DiagramsPublicController } from './diagrams.public.controller';
import { DiagramsAdminController } from './diagrams.admin.controller';

@Module({
  controllers: [DiagramsPublicController, DiagramsAdminController],
  providers: [DiagramsService],
  exports: [DiagramsService],
})
export class DiagramsModule {}
