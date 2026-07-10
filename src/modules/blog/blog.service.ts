import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);
  private cache: { value: any; expiresAt: number } | null = null;
  private readonly CACHE_TTL_MS = 300000; // 5 minutos

  constructor(private readonly prisma: PrismaService) {}

  async findAll(published: boolean, page: number, limit: number, tag?: string, projectId?: string) {
    const skip = (page - 1) * limit;

    const where: any = { published };
    if (tag) {
      where.tags = { some: { name: tag } };
    }
    if (projectId) {
      where.projectId = projectId;
    }

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        include: {
          tags: true,
          project: {
            select: { id: true, title: true, imageUrl: true },
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: articles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Admin: return ALL articles regardless of published status */
  async findAllAll(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        include: {
          tags: true,
          project: {
            select: { id: true, title: true, imageUrl: true },
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.article.count(),
    ]);

    return {
      data: articles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findFeatured() {
    const cacheKey = 'featured';
    if (this.cache && this.cache.expiresAt > Date.now() && this.cache.value?.cacheKey === cacheKey) {
      return this.cache.value.data;
    }

    const articles = await this.prisma.article.findMany({
      where: { published: true, featured: true },
      include: {
        tags: true,
        project: {
          select: { id: true, title: true, imageUrl: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });

    this.cache = {
      value: { cacheKey, data: articles },
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    };

    return articles;
  }

  async findBySlug(slug: string) {
    return this.prisma.article.findUnique({
      where: { slug },
      include: {
        tags: true,
        project: {
          select: { id: true, title: true, imageUrl: true, githubUrl: true, liveUrl: true },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.article.findUnique({
      where: { id },
      include: {
        tags: true,
        project: {
          select: { id: true, title: true, imageUrl: true, githubUrl: true, liveUrl: true },
        },
      },
    });
  }

  async findAllTags() {
    const tags = await this.prisma.articleTag.findMany({
      include: {
        _count: {
          select: { articles: { where: { published: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      articleCount: tag._count.articles,
    }));
  }

  async create(dto: CreateArticleDto) {
    const slug = dto.slug || this.generateSlug(dto.title);

    const tagsConnectOrCreate = dto.tags?.map((name) => ({
      where: { name },
      create: { name },
    }));

    return this.prisma.article.create({
      data: {
        title: dto.title as any,
        slug,
        excerpt: dto.excerpt as any,
        content: dto.content as any,
        coverImage: dto.coverImage,
        author: dto.author,
        published: dto.published ?? false,
        featured: dto.featured ?? false,
        metaTitle: dto.metaTitle as any,
        metaDescription: dto.metaDescription as any,
        projectId: dto.projectId,
        publishedAt: dto.published ? new Date() : null,
        tags: tagsConnectOrCreate ? { connectOrCreate: tagsConnectOrCreate } : undefined,
      },
      include: { tags: true },
    });
  }

  async update(id: string, dto: UpdateArticleDto) {
    const slug = dto.slug || (dto.title ? this.generateSlug(dto.title) : undefined);

    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.update({
        where: { id },
        data: {
          title: dto.title as any,
          slug,
          excerpt: dto.excerpt as any,
          content: dto.content as any,
          coverImage: dto.coverImage,
          author: dto.author,
          published: dto.published,
          featured: dto.featured,
          metaTitle: dto.metaTitle as any,
          metaDescription: dto.metaDescription as any,
          projectId: dto.projectId,
          publishedAt: dto.published ? new Date() : undefined,
        },
      });

      if (dto.tags !== undefined) {
        const tagPromises = dto.tags.map((name) =>
          tx.articleTag.upsert({
            where: { name },
            update: {},
            create: { name },
          }),
        );
        const tags = await Promise.all(tagPromises);

        await tx.article.update({
          where: { id },
          data: {
            tags: { set: tags.map((t) => ({ id: t.id })) },
          },
        });
      }

      return tx.article.findUnique({
        where: { id: article.id },
        include: { tags: true },
      });
    }, { timeout: 10000 });
  }

  async remove(id: string) {
    return this.prisma.article.delete({ where: { id } });
  }

  private generateSlug(title: any): string {
    const text = typeof title === 'string' ? title : title?.es || title?.en || '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
