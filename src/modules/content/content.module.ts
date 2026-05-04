import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentPublicController } from './content.public.controller';
import { ContentAdminController } from './content.admin.controller';

@Module({
  controllers: [ContentPublicController, ContentAdminController],
  providers: [ContentService],
})
export class ContentModule {}
