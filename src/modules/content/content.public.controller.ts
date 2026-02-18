import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ContentService } from './content.service';

@ApiTags('public-content')
@Controller('public/pages')
export class ContentPublicController {
  constructor(private readonly contentService: ContentService) {}

  @Get(':slug')
  getPageBySlug(@Param('slug') slug: string) {
    return this.contentService.getPublishedPageBySlug(slug);
  }
}
