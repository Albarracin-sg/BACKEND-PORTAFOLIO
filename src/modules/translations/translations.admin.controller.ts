import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TranslationsService } from './translations.service';
import { UpsertTranslationDto } from './dto/upsert-translation.dto';

@ApiTags('admin-translations')
@ApiBearerAuth()
@Controller('admin/translations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class TranslationsAdminController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Post()
  upsertTranslation(@Body() body: UpsertTranslationDto) {
    return this.translationsService.upsertTranslation(body);
  }
}
