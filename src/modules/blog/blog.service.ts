import { Injectable, Logger } from '@nestjs/common';
import { type ArticleEngagement, type Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ARTICLE_INTERACTION, type ArticleInteraction } from './dto/article-interaction.dto';
import { BLOG_SORT, type BlogSort } from './dto/article-query.dto';

interface RankableArticle {
  id: string;
  publishedAt: Date | null;
  engagement: ArticleEngagement | null;
}

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);
  private cache: { value: any; expiresAt: number } | null = null;
  private readonly CACHE_TTL_MS = 300000; // 5 minutos

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    published: boolean,
    page: number,
    limit: number,
    tag?: string,
    projectId?: string,
    sort: BlogSort = BLOG_SORT.DISCOVER,
  ) {
    const skip = (page - 1) * limit;

    const where = this.buildArticleWhere(published, tag, projectId);

    if (sort === BLOG_SORT.DISCOVER) {
      return this.findDiscoverableArticles(where, page, limit);
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

  async findForHome() {
    const where = this.buildArticleWhere(true);
    const candidates = await this.findRankingCandidates(where);
    const ids = this.pickHomeArticles(candidates);
    const articles = await this.findArticlesByIds(ids);

    await this.recordImpressions(articles.map((article) => article.id));
    return articles;
  }

  async recordInteraction(articleId: string, type: ArticleInteraction, readDurationSeconds = 0) {
    const article = await this.prisma.article.findFirst({
      where: {
        id: articleId,
        ...this.buildArticleWhere(true),
      },
      select: { id: true },
    });

    if (!article) return;

    const now = new Date();
    const isQualifiedRead = type === ARTICLE_INTERACTION.QUALIFIED_READ;

    await this.prisma.articleEngagement.upsert({
      where: { articleId },
      create: {
        articleId,
        opens: type === ARTICLE_INTERACTION.OPEN ? 1 : 0,
        qualifiedReads: isQualifiedRead ? 1 : 0,
        totalReadSeconds: isQualifiedRead ? readDurationSeconds : 0,
        lastInteractionAt: now,
      },
      update: {
        opens: type === ARTICLE_INTERACTION.OPEN ? { increment: 1 } : undefined,
        qualifiedReads: isQualifiedRead ? { increment: 1 } : undefined,
        totalReadSeconds: isQualifiedRead ? { increment: readDurationSeconds } : undefined,
        lastInteractionAt: now,
      },
    });
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
      where: {
        published: true,
        featured: true,
        OR: [
          { projectId: null },
          { project: { is: { isActive: true } } },
        ],
      },
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
    return this.prisma.article.findFirst({
      where: {
        slug,
        published: true,
        OR: [
          { projectId: null },
          { project: { is: { isActive: true } } },
        ],
      },
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

  private buildArticleWhere(published: boolean, tag?: string, projectId?: string): Prisma.ArticleWhereInput {
    const where: Prisma.ArticleWhereInput = { published };

    if (published) {
      where.OR = [
        { projectId: null },
        { project: { is: { isActive: true } } },
      ];
    }
    if (tag) where.tags = { some: { name: tag } };
    if (projectId) where.projectId = projectId;

    return where;
  }

  private async findDiscoverableArticles(where: Prisma.ArticleWhereInput, page: number, limit: number) {
    const candidates = await this.findRankingCandidates(where);
    const orderedIds = this.buildDiscoveryOrder(candidates);
    const start = (page - 1) * limit;
    const articles = await this.findArticlesByIds(orderedIds.slice(start, start + limit));

    await this.recordImpressions(articles.map((article) => article.id));

    return {
      data: articles,
      meta: {
        total: candidates.length,
        page,
        limit,
        totalPages: Math.ceil(candidates.length / limit),
      },
    };
  }

  private findRankingCandidates(where: Prisma.ArticleWhereInput) {
    return this.prisma.article.findMany({
      where,
      select: {
        id: true,
        publishedAt: true,
        engagement: true,
      },
    });
  }

  private async findArticlesByIds(ids: string[]) {
    if (!ids.length) return [];

    const articles = await this.prisma.article.findMany({
      where: { id: { in: ids } },
      include: {
        tags: true,
        project: {
          select: { id: true, title: true, imageUrl: true },
        },
      },
    });
    const byId = new Map(articles.map((article) => [article.id, article]));

    return ids.flatMap((id) => {
      const article = byId.get(id);
      return article ? [article] : [];
    });
  }

  private buildDiscoveryOrder(articles: RankableArticle[]) {
    const selected = new Set<string>();
    const ranked = this.sortByRelevance(articles);
    const exploratory = [...articles].sort((left, right) => {
      const impressionDifference = this.impressions(left) - this.impressions(right);
      return impressionDifference || this.dailyHash(left.id) - this.dailyHash(right.id);
    });
    const order: string[] = [];

    while (order.length < articles.length) {
      const source = (order.length + 1) % 4 === 0 ? exploratory : ranked;
      const candidate = source.find((article) => !selected.has(article.id))
        ?? ranked.find((article) => !selected.has(article.id));

      if (!candidate) break;
      selected.add(candidate.id);
      order.push(candidate.id);
    }

    return order;
  }

  private pickHomeArticles(articles: RankableArticle[]) {
    const ranked = this.sortByRelevance(articles);
    const rankingPool = ranked.slice(0, Math.min(8, ranked.length));
    const rankedIds = [...rankingPool]
      .sort((left, right) => {
        const scoreDifference = this.rankingScore(right) + this.dailyHash(right.id) * 0.35
          - (this.rankingScore(left) + this.dailyHash(left.id) * 0.35);
        return scoreDifference || left.id.localeCompare(right.id);
      })
      .slice(0, 2)
      .map((article) => article.id);
    const selected = new Set(rankedIds);
    const exploratory = [...articles]
      .filter((article) => !selected.has(article.id))
      .sort((left, right) => {
        const impressionDifference = this.impressions(left) - this.impressions(right);
        return impressionDifference || this.dailyHash(left.id) - this.dailyHash(right.id);
      });

    return exploratory[0] ? [...rankedIds, exploratory[0].id] : rankedIds;
  }

  private sortByRelevance(articles: RankableArticle[]) {
    return [...articles].sort((left, right) => {
      const scoreDifference = this.rankingScore(right) - this.rankingScore(left);
      return scoreDifference || this.dailyHash(left.id) - this.dailyHash(right.id);
    });
  }

  private rankingScore(article: RankableArticle) {
    const engagement = article.engagement;
    const impressions = engagement?.impressions ?? 0;
    const opens = engagement?.opens ?? 0;
    const qualifiedReads = engagement?.qualifiedReads ?? 0;
    const averageReadSeconds = qualifiedReads
      ? (engagement?.totalReadSeconds ?? 0) / qualifiedReads
      : 0;
    const ageInDays = article.publishedAt
      ? Math.max(0, (Date.now() - article.publishedAt.getTime()) / 86_400_000)
      : 365;
    const freshness = Math.max(0, 1 - ageInDays / 180);
    const engagementRate = (opens * 2 + qualifiedReads * 5) / (impressions + 3);
    const readDepth = Math.min(averageReadSeconds / 90, 1);
    const exposurePenalty = Math.min(Math.log1p(impressions) / 10, 0.3);

    return engagementRate * 5 + readDepth * 1.5 + freshness * 0.6 - exposurePenalty;
  }

  private impressions(article: RankableArticle) {
    return article.engagement?.impressions ?? 0;
  }

  private async recordImpressions(articleIds: string[]) {
    if (!articleIds.length) return;

    const now = new Date();
    await Promise.all(articleIds.map((articleId) => this.prisma.articleEngagement.upsert({
      where: { articleId },
      create: { articleId, impressions: 1, lastImpressionAt: now },
      update: { impressions: { increment: 1 }, lastImpressionAt: now },
    })));
  }

  private dailyHash(value: string) {
    const source = `${new Date().toISOString().slice(0, 10)}:${value}`;
    let hash = 0;

    for (let index = 0; index < source.length; index += 1) {
      hash = (hash * 31 + source.charCodeAt(index)) | 0;
    }

    return (hash >>> 0) / 4_294_967_295;
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
