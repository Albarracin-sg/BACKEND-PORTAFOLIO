import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TranslationsService } from './translations.service';

@ApiTags('public-translations')
@Controller('public/translations')
export class TranslationsPublicController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Get()
  getTranslations(@Query('lang') lang: string) {
    return this.translationsService.getTranslationsByLang(lang);
  }
}
