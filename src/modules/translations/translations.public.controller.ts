import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TranslationsService } from './translations.service';

@ApiTags('public-translations')
@Controller('public/translations')
export class TranslationsPublicController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  getTranslations(@Query('lang') lang: string) {
    return this.translationsService.getTranslationsByLang(lang);
  }
}
