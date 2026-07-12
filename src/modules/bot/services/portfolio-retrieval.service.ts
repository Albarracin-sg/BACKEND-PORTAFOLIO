import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const PORTFOLIO_SOURCE_TYPE = {
  ARTICLE: 'article',
  PROJECT: 'project',
  DIAGRAM: 'diagram',
} as const;

type PortfolioSourceType = (typeof PORTFOLIO_SOURCE_TYPE)[keyof typeof PORTFOLIO_SOURCE_TYPE];

const EMBEDDING_PURPOSE = {
  DOCUMENT: 'document',
  QUERY: 'query',
} as const;

type EmbeddingPurpose = (typeof EMBEDDING_PURPOSE)[keyof typeof EMBEDDING_PURPOSE];

interface PortfolioSource {
  type: PortfolioSourceType;
  id: string;
  title: string;
  url: string;
  content: string;
}

interface VectorSearchRow {
  sourceType: string;
  sourceId: string;
  title: string;
  url: string;
  content: string;
  similarity: number;
}

export interface SyncSummary {
  indexed: number;
  skipped: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class PortfolioRetrievalService {
  private readonly logger = new Logger(PortfolioRetrievalService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getLocalizedText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value !== 'object' || value === null) return '';

    const localized = value as Record<string, unknown>;
    return typeof localized.es === 'string'
      ? localized.es
      : typeof localized.en === 'string'
        ? localized.en
        : '';
  }

  private getDiagramLabels(value: unknown): string {
    if (typeof value !== 'object' || value === null) return '';
    const source = value as Record<string, unknown>;
    if (!Array.isArray(source.nodes)) return '';

    return source.nodes
      .map((node) => {
        if (typeof node !== 'object' || node === null) return '';
        const data = (node as Record<string, unknown>).data;
        if (typeof data !== 'object' || data === null) return '';
        const label = (data as Record<string, unknown>).label;
        return typeof label === 'string' ? label : '';
      })
      .filter(Boolean)
      .join(', ');
  }

  private async getSources(): Promise<PortfolioSource[]> {
    const [articles, projects, diagrams] = await Promise.all([
      this.prisma.article.findMany({
        where: { published: true },
        select: { slug: true, title: true, excerpt: true, content: true, tags: { select: { name: true } } },
      }),
      this.prisma.project.findMany({
        where: { isActive: true, kind: 'PUBLIC' },
        select: {
          id: true,
          title: true,
          description: true,
          problem: true,
          solution: true,
          technologies: { select: { technology: { select: { name: true } } } },
        },
      }),
      this.prisma.architectureDiagram.findMany({
        where: { published: true, project: { is: { isActive: true, kind: 'PUBLIC' } } },
        select: { id: true, title: true, description: true, source: true, project: { select: { id: true, title: true } } },
      }),
    ]);

    return [
      ...articles.map((article) => ({
        type: PORTFOLIO_SOURCE_TYPE.ARTICLE,
        id: article.slug,
        title: this.getLocalizedText(article.title),
        url: `/blog/${article.slug}`,
        content: [
          this.getLocalizedText(article.title),
          this.getLocalizedText(article.excerpt),
          this.getLocalizedText(article.content),
          article.tags.map((tag) => tag.name).join(' '),
        ].join('\n').slice(0, 6000),
      })),
      ...projects.map((project) => ({
        type: PORTFOLIO_SOURCE_TYPE.PROJECT,
        id: project.id,
        title: project.title,
        url: `/projects/${project.id}`,
        content: [
          project.title,
          this.getLocalizedText(project.description),
          this.getLocalizedText(project.problem),
          this.getLocalizedText(project.solution),
          project.technologies.map(({ technology }) => technology.name).join(' '),
        ].join('\n').slice(0, 6000),
      })),
      ...diagrams.map((diagram) => ({
        type: PORTFOLIO_SOURCE_TYPE.DIAGRAM,
        id: diagram.id,
        title: `${this.getLocalizedText(diagram.title)} — ${diagram.project.title}`,
        url: `/projects/${diagram.project.id}`,
        content: [
          this.getLocalizedText(diagram.title),
          this.getLocalizedText(diagram.description),
          this.getDiagramLabels(diagram.source),
        ].join('\n').slice(0, 6000),
      })),
    ];
  }

  private getChecksum(source: PortfolioSource): string {
    return createHash('sha256')
      .update(`${source.type}:${source.id}:${source.title}:${source.url}:${source.content}`)
      .digest('hex');
  }

  private vectorLiteral(values: number[]): string {
    return `[${values.join(',')}]`;
  }

  private parseEmbedding(value: unknown, dimensions: number): number[] | null {
    const candidate = Array.isArray(value) && Array.isArray(value[0])
      ? value[0]
      : value;

    if (!Array.isArray(candidate) || candidate.length !== dimensions) {
      return null;
    }

    return candidate.every((item) => typeof item === 'number' && Number.isFinite(item))
      ? candidate
      : null;
  }

  private async createEmbedding(input: string, purpose: EmbeddingPurpose): Promise<number[] | null> {
    const apiKey = this.configService.get<string>('HUGGINGFACE_API_KEY');
    const model = this.configService.get<string>('HUGGINGFACE_EMBEDDING_MODEL')
      ?? 'intfloat/multilingual-e5-small';
    const apiUrl = this.configService.get<string>('HUGGINGFACE_EMBEDDINGS_URL')
      ?? `https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`;
    const dimensions = this.configService.get<number>('HUGGINGFACE_EMBEDDING_DIMENSIONS') ?? 384;

    if (!apiKey) return null;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: `${purpose === EMBEDDING_PURPOSE.QUERY ? 'query' : 'passage'}: ${input}`,
        options: { wait_for_model: true },
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 300);
      throw new Error(`Embedding provider returned ${response.status}: ${detail}`);
    }

    const embedding = this.parseEmbedding(await response.json(), dimensions);
    if (!embedding) {
      throw new Error(`Embedding provider returned invalid vector dimensions; expected ${dimensions}`);
    }

    return embedding;
  }

  async syncEmbeddings(): Promise<SyncSummary> {
    const sources = await this.getSources();
    const startedAt = new Date();
    let indexed = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const source of sources) {
      try {
        const checksum = this.getChecksum(source);
        const current = await this.prisma.$queryRaw<{ checksum: string }[]>(Prisma.sql`
          SELECT "checksum" FROM "PortfolioEmbedding"
          WHERE "sourceType" = ${source.type} AND "sourceId" = ${source.id}
        `);

        if (current[0]?.checksum === checksum) {
          await this.prisma.$executeRaw(Prisma.sql`
            UPDATE "PortfolioEmbedding" SET "updatedAt" = ${startedAt}
            WHERE "sourceType" = ${source.type} AND "sourceId" = ${source.id}
          `);
          skipped++;
          continue;
        }

        const embedding = await this.createEmbedding(source.content, EMBEDDING_PURPOSE.DOCUMENT);
        if (!embedding) {
          throw new Error('Embedding configuration is incomplete');
        }

        const vector = this.vectorLiteral(embedding);
        await this.prisma.$executeRaw(Prisma.sql`
          INSERT INTO "PortfolioEmbedding" ("sourceType", "sourceId", "title", "url", "content", "checksum", "embedding", "updatedAt")
          VALUES (${source.type}, ${source.id}, ${source.title}, ${source.url}, ${source.content}, ${checksum}, ${vector}::vector, ${startedAt})
          ON CONFLICT ("sourceType", "sourceId") DO UPDATE SET
            "title" = EXCLUDED."title",
            "url" = EXCLUDED."url",
            "content" = EXCLUDED."content",
            "checksum" = EXCLUDED."checksum",
            "embedding" = EXCLUDED."embedding",
            "updatedAt" = EXCLUDED."updatedAt"
        `);
        indexed++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to index ${source.type}:${source.id}: ${message}`);
        if (errors.length < 5) {
          errors.push(`${source.type}:${source.id}: ${message}`);
        }
        failed++;
      }
    }

    if (failed === 0) {
      await this.prisma.$executeRaw(Prisma.sql`
        DELETE FROM "PortfolioEmbedding" WHERE "updatedAt" < ${startedAt}
      `);
    }

    this.logger.log(`Portfolio embeddings sync: ${indexed} indexed, ${skipped} unchanged, ${failed} failed`);
    return { indexed, skipped, failed, errors };
  }

  async search(query: string, limit = 4): Promise<PortfolioSource[]> {
    try {
      const embedding = await this.createEmbedding(query, EMBEDDING_PURPOSE.QUERY);
      if (!embedding) return [];

      const vector = this.vectorLiteral(embedding);
      const rows = await this.prisma.$queryRaw<VectorSearchRow[]>(Prisma.sql`
        SELECT
          "sourceType",
          "sourceId",
          "title",
          "url",
          "content",
          1 - ("embedding" <=> ${vector}::vector) AS "similarity"
        FROM "PortfolioEmbedding"
        ORDER BY "embedding" <=> ${vector}::vector
        LIMIT ${limit}
      `);

      return rows
        .filter((row) => row.similarity >= 0.35)
        .map((row) => ({
          type: row.sourceType as PortfolioSourceType,
          id: row.sourceId,
          title: row.title,
          url: row.url,
          content: row.content,
        }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Vector retrieval unavailable, using lexical fallback: ${message}`);
      return [];
    }
  }
}
