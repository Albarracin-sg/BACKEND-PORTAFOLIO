import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertTranslationDto } from './dto/upsert-translation.dto';

@Injectable()
export class TranslationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTranslationsByLang(lang: string) {
    return this.prisma.translation.findMany({
      where: { lang },
      orderBy: { namespace: 'asc' },
    });
  }

  async upsertTranslation(data: UpsertTranslationDto) {
    return this.prisma.translation.upsert({
      where: { lang_namespace: { lang: data.lang, namespace: data.namespace } },
      update: { content: data.content },
      create: data,
    });
  }
}
