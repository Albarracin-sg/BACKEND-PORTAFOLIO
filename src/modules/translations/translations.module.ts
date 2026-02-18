import { Module } from '@nestjs/common';
import { TranslationsService } from './translations.service';
import { TranslationsPublicController } from './translations.public.controller';
import { TranslationsAdminController } from './translations.admin.controller';

@Module({
  controllers: [TranslationsPublicController, TranslationsAdminController],
  providers: [TranslationsService],
})
export class TranslationsModule {}
