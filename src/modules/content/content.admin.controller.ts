import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@ApiTags('admin-content')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ContentAdminController {
  constructor(private readonly contentService: ContentService) {}

  @Get('pages')
  listPages() {
    return this.contentService.listPages();
  }

  @Post('pages')
  createPage(@Body() body: CreatePageDto) {
    return this.contentService.createPage(body);
  }

  @Put('pages/:id')
  updatePage(@Param('id') id: string, @Body() body: UpdatePageDto) {
    return this.contentService.updatePage(id, body);
  }

  @Delete('pages/:id')
  deletePage(@Param('id') id: string) {
    return this.contentService.deletePage(id);
  }

  @Get('sections')
  listSections(@Query('pageId') pageId?: string) {
    return this.contentService.listSections(pageId);
  }

  @Post('sections')
  createSection(@Body() body: CreateSectionDto) {
    return this.contentService.createSection(body);
  }

  @Put('sections/:id')
  updateSection(@Param('id') id: string, @Body() body: UpdateSectionDto) {
    return this.contentService.updateSection(id, body);
  }

  @Delete('sections/:id')
  deleteSection(@Param('id') id: string) {
    return this.contentService.deleteSection(id);
  }
}
