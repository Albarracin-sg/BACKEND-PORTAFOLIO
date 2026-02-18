import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublishedPageBySlug(slug: string) {
    const page = await this.prisma.page.findFirst({
      where: { slug, isPublished: true },
      include: { sections: { orderBy: { order: 'asc' } } },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return page;
  }

  async listPages() {
    return this.prisma.page.findMany({
      include: { sections: { orderBy: { order: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createPage(data: CreatePageDto) {
    return this.prisma.page.create({ data });
  }

  async updatePage(id: string, data: UpdatePageDto) {
    const updateData: UpdatePageDto = {};
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;

    return this.prisma.page.update({ where: { id }, data: updateData });
  }

  async deletePage(id: string) {
    return this.prisma.page.delete({ where: { id } });
  }

  async listSections(pageId?: string) {
    return this.prisma.section.findMany({
      where: pageId ? { pageId } : undefined,
      orderBy: { order: 'asc' },
    });
  }

  async createSection(data: CreateSectionDto) {
    return this.prisma.section.create({
      data: {
        pageId: data.pageId,
        type: data.type,
        order: data.order,
        content: data.content,
      },
    });
  }

  async updateSection(id: string, data: UpdateSectionDto) {
    const updateData: UpdateSectionDto = {};
    if (data.pageId !== undefined) updateData.pageId = data.pageId;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.content !== undefined) updateData.content = data.content;

    return this.prisma.section.update({ where: { id }, data: updateData });
  }

  async deleteSection(id: string) {
    return this.prisma.section.delete({ where: { id } });
  }
}
