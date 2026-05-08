import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { GithubService } from '../github/github.service';
import { AiService } from '../ai/ai.service';
import { Prisma } from '@prisma/client';

interface ProjectQuery {
  search?: string;
  category?: string;
  tech?: string;
  sortBy?: 'date' | 'stars' | 'name' | 'views';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  private cache: { value: any; expiresAt: number } | null = null;
  private readonly CACHE_TTL_MS = 300000; // 5 minutos

  constructor(
    private readonly prisma: PrismaService,
    private readonly githubService: GithubService,
    private readonly aiService: AiService,
  ) {}

  async listPublicProjects(query: ProjectQuery) {
    const { search, category, tech, sortBy = 'date', sortOrder = 'desc' } = query;

    // Cache check - no hacer sync en cada request!
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.filterProjects(this.cache.value, query);
    }

    // Solo hacer query a DB si no hay cache
    const projects = await this.prisma.project.findMany({
      where: this.buildWhereClause(query),
      include: { technologies: { include: { technology: true } } },
      orderBy: this.buildOrderBy(sortBy, sortOrder),
    });

    // Guardar en cache
    this.cache = {
      value: projects,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    };

    return projects;
  }

  private buildWhereClause(query: ProjectQuery): Prisma.ProjectWhereInput {
    const conditions: Prisma.ProjectWhereInput[] = [];

    if (query.category && query.category !== 'all') {
      conditions.push({ category: query.category });
    }

    if (query.tech && query.tech !== 'all') {
      conditions.push({
        technologies: { some: { technology: { name: query.tech } } },
      });
    }

    if (query.search) {
      conditions.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          {
            description: {
              path: ['es'],
              string_contains: query.search,
            },
          },
          {
            description: {
              path: ['en'],
              string_contains: query.search,
            },
          },
        ],
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  private buildOrderBy(sortBy: string, sortOrder: string): Prisma.ProjectOrderByWithRelationInput {
    const order = sortOrder as 'asc' | 'desc';
    if (sortBy === 'name') return { title: order };
    if (sortBy === 'stars') return { stars: order };
    if (sortBy === 'views') return { views: order };
    return { date: order };
  }

  private filterProjects(projects: any[], query: ProjectQuery) {
    // Aplicar filtros en memoria si hay cache
    return projects.filter((p) => {
      if (query.category && query.category !== 'all' && p.category !== query.category) return false;
      if (query.tech && query.tech !== 'all') {
        const hasTech = p.technologies?.some((t: any) => t.technology.name === query.tech);
        if (!hasTech) return false;
      }
      return true;
    });
  }

  async listPublicProjectsOld(query: ProjectQuery) {
    const { search, category, tech, sortBy = 'date', sortOrder = 'desc' } = query;

    const orderBy =
      sortBy === 'name'
        ? { title: sortOrder }
        : sortBy === 'stars'
          ? { stars: sortOrder }
          : sortBy === 'views'
            ? { views: sortOrder }
            : { date: sortOrder };

    return this.prisma.project.findMany({
      where: {
        AND: [
          category && category !== 'all' ? { category } : {},
          tech && tech !== 'all'
            ? {
                technologies: {
                  some: {
                    technology: { name: tech },
                  },
                },
              }
            : {},
          search
            ? {
                OR: [
                  { title: { contains: search, mode: 'insensitive' } },
                  {
                    description: {
                      path: ['es'],
                      string_contains: search,
                    },
                  },
                  {
                    description: {
                      path: ['en'],
                      string_contains: search,
                    },
                  },
                  {
                    technologies: {
                      some: {
                        technology: { name: { contains: search, mode: 'insensitive' } },
                      },
                    },
                  },
                ],
              }
            : {},
        ],
      },
      include: { technologies: { include: { technology: true } } },
      orderBy,
    });
  }

  async syncGithubProjects() {
    const repos = await this.githubService.listRepos();
    const sortedByStars = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count);
    const featuredIds = new Set(sortedByStars.slice(0, 3).map((repo) => repo.id));
    const repoUrls = repos.map((repo) => repo.html_url);

    let created = 0;
    let updated = 0;

    if (repoUrls.length > 0) {
      await this.prisma.project.deleteMany({
        where: { githubUrl: { notIn: repoUrls } },
      });
    }

    for (const repo of repos) {
      const existing = await this.prisma.project.findFirst({
        where: { githubUrl: repo.html_url },
        include: { technologies: { include: { technology: true } } },
      });

      const lastPush = new Date(repo.pushed_at ?? repo.updated_at);

      if (!existing) {
        this.logger.log(`🆕 New project: ${repo.name}. Enriching...`);
        const repoExtraInfo = await this.getRepoExtraInfo(repo);
        const aiEnrichment = await this.enrichProjectWithAi(repo, repoExtraInfo);
        
        const techNames = Array.from(new Set([
          repo.language,
          ...(repo.topics ?? []),
          ...(aiEnrichment.technologies ?? [])
        ])).filter((t): t is string => Boolean(t));

        const technologies = techNames.map((name) => ({
          technology: {
            connectOrCreate: {
              where: { name },
              create: { name },
            },
          },
        }));

        await this.prisma.project.create({
          data: {
            title: repo.name,
            description: aiEnrichment.description || { es: repo.description ?? 'Repositorio público en GitHub', en: repo.description ?? 'Public repository on GitHub' },
            problem: aiEnrichment.problem || { es: '', en: '' },
            challenge: aiEnrichment.challenge || { es: '', en: '' },
            solution: aiEnrichment.solution || { es: '', en: '' },
            imageUrl: `https://opengraph.githubassets.com/1/${repo.owner.login}/${repo.name}`,
            githubUrl: repo.html_url,
            liveUrl: repo.homepage || null,
            category: aiEnrichment.category || 'web',
            status: repo.archived ? 'prototype' : 'production',
            featured: featuredIds.has(repo.id),
            stars: repo.stargazers_count ?? 0,
            forks: repo.forks_count ?? 0,
            views: 0,
            date: lastPush,
            technologies: technologies.length > 0 ? { create: technologies } : undefined,
          },
        });
        created += 1;
        continue;
      }

      // SMART SYNC: Solo IA si no hay contenido detallado O si el repo cambió
      const hasDetailedContent = existing.problem && (existing.problem as any).en !== '';
      const isOutdated = existing.date.getTime() !== lastPush.getTime();
      
      let aiEnrichment: any = null;

      if (!hasDetailedContent || isOutdated) {
        this.logger.log(`🔄 Re-enriching ${repo.name} (Changed or Empty)...`);
        const repoExtraInfo = await this.getRepoExtraInfo(repo);
        aiEnrichment = await this.enrichProjectWithAi(repo, repoExtraInfo);
      } else {
        this.logger.log(`⏩ Skipping enrichment for ${repo.name} (Up to date)`);
      }

      if (aiEnrichment?.technologies) {
        await this.prisma.projectTechnology.deleteMany({ where: { projectId: existing.id } });
        const techNames = Array.from(new Set([
          repo.language,
          ...(repo.topics ?? []),
          ...(aiEnrichment.technologies ?? [])
        ])).filter((t): t is string => Boolean(t));

        for (const name of techNames) {
          await this.prisma.projectTechnology.create({
            data: {
              project: { connect: { id: existing.id } },
              technology: {
                connectOrCreate: {
                  where: { name },
                  create: { name },
                },
              },
            },
          });
        }
      }

      await this.prisma.project.update({
        where: { id: existing.id },
        data: {
          imageUrl:
            existing.imageUrl ||
            `https://opengraph.githubassets.com/1/${repo.owner.login}/${repo.name}`,
          stars: repo.stargazers_count ?? existing.stars,
          forks: repo.forks_count ?? existing.forks,
          date: lastPush,
          liveUrl: repo.homepage || existing.liveUrl,
          category: aiEnrichment?.category || existing.category,
          ...(aiEnrichment?.problem ? {
            description: aiEnrichment.description,
            problem: aiEnrichment.problem,
            challenge: aiEnrichment.challenge,
            solution: aiEnrichment.solution,
          } : {})
        },
      });
      updated += 1;
    }

    return { total: repos.length, created, updated };
  }

  private async getRepoExtraInfo(repo: any) {
    const [readme, packageJson, tree] = await Promise.all([
      this.githubService.getRepoFile(repo.owner.login, repo.name, 'README.md'),
      this.githubService.getRepoFile(repo.owner.login, repo.name, 'package.json'),
      this.githubService.getRepoTree(repo.owner.login, repo.name),
    ]);

    return {
      readme: readme?.substring(0, 3000), // Limitamos para no matar el contexto
      packageJson: packageJson ? JSON.parse(packageJson) : null,
      fileList: tree?.tree?.slice(0, 50).map((f: any) => f.path).join(', '),
    };
  }

  private async enrichProjectWithAi(repo: any, extra: any) {
    this.logger.log(`🤖 Enriching project ${repo.name} with AI (Full Analysis)...`);
    
    const prompt = `You are a Senior Software Architect. Analyze this GitHub repository and generate professional content and metadata for a portfolio.
    
REPOSITORY: ${repo.name}
DESCRIPTION: ${repo.description}
TECH STACK (GitHub): ${repo.language}, ${repo.topics?.join(', ')}
FILE LIST: ${extra.fileList}
PACKAGE JSON: ${extra.packageJson ? JSON.stringify(extra.packageJson).substring(0, 1000) : 'N/A'}
README SNIPPET: ${extra.readme}

OUTPUT FORMAT (JSON ONLY):
{
  "description": { "en": "...", "es": "..." },
  "problem": { "en": "...", "es": "..." },
  "challenge": { "en": "...", "es": "..." },
  "solution": { "en": "...", "es": "..." },
  "category": "web | ai | automation | mobile | tool | library | education",
  "technologies": ["Tech1", "Tech2", "Tech3", ...]
}

GUIDELINES:
- Spanish must use "voseo" (Juan Camilo persona style).
- "category": Choose the most appropriate one from the list provided.
- "technologies": Identify ALL relevant technologies by looking at dependencies in package.json and file list. Include frameworks, libraries, databases, and languages.
- Be precise, technical, and concise.`;

    try {
      const response = await this.aiService.callModel([
        { role: 'system', content: 'You are a professional technical architect and writer.' },
        { role: 'user', content: prompt }
      ]);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch (error) {
      this.logger.error(`Failed to enrich project ${repo.name}: ${error.message}`);
      return {};
    }
  }

  async getProject(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { technologies: { include: { technology: true } } },
    });
  }

  async listAdminProjects() {
    return this.prisma.project.findMany({
      include: { technologies: { include: { technology: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createProject(data: CreateProjectDto) {
    const techCreate = data.technologies?.map((name) => ({
      technology: {
        connectOrCreate: {
          where: { name },
          create: { name },
        },
      },
    }));

    return this.prisma.project.create({
      data: {
        title: data.title,
        description: data.description,
        problem: data.problem,
        challenge: data.challenge,
        solution: data.solution,
        imageUrl: data.imageUrl,
        githubUrl: data.githubUrl,
        liveUrl: data.liveUrl,
        category: data.category,
        status: data.status,
        featured: data.featured ?? false,
        stars: data.stars ?? 0,
        forks: data.forks ?? 0,
        views: data.views ?? 0,
        date: new Date(data.date),
        technologies: techCreate ? { create: techCreate } : undefined,
      },
      include: { technologies: { include: { technology: true } } },
    });
  }

  async updateProject(id: string, data: UpdateProjectDto) {
    const baseUpdate = {
      title: data.title,
      description: data.description,
      problem: data.problem,
      challenge: data.challenge,
      solution: data.solution,
      imageUrl: data.imageUrl,
      githubUrl: data.githubUrl,
      liveUrl: data.liveUrl,
      category: data.category,
      status: data.status,
      featured: data.featured,
      stars: data.stars,
      forks: data.forks,
      views: data.views,
      date: data.date ? new Date(data.date) : undefined,
    };

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id },
        data: baseUpdate,
      });

      if (data.technologies) {
        // 1. Borrar asociaciones viejas
        await tx.projectTechnology.deleteMany({ where: { projectId: id } });
        
        // 2. Asegurar que todas las tecnologías existan (concurrentemente)
        const techPromises = data.technologies.map(name => 
          tx.technology.upsert({
            where: { name },
            update: {},
            create: { name },
          })
        );
        const techs = await Promise.all(techPromises);

        // 3. Crear las nuevas asociaciones en batch
        if (techs.length > 0) {
          await tx.projectTechnology.createMany({
            data: techs.map(t => ({
              projectId: id,
              technologyId: t.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.project.findUnique({
        where: { id: project.id },
        include: { technologies: { include: { technology: true } } },
      });
    }, {
      timeout: 10000, // 10 segundos para evitar timeouts en operaciones pesadas
    });
  }

  async deleteProject(id: string) {
    return this.prisma.project.delete({ where: { id } });
  }

}
