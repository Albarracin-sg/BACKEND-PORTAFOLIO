import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { GithubService } from '../github/github.service';

interface ProjectQuery {
  search?: string;
  category?: string;
  tech?: string;
  sortBy?: 'date' | 'stars' | 'name' | 'views';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly githubService: GithubService,
  ) {}

  async listPublicProjects(query: ProjectQuery) {
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
                  { description: { contains: search, mode: 'insensitive' } },
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

      if (!existing) {
        const technologies = [repo.language, ...(repo.topics ?? [])]
          .filter((value): value is string => Boolean(value))
          .map((name) => ({
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
            description: repo.description ?? 'Repositorio publico en GitHub',
            problem: '',
            challenge: '',
            solution: '',
            imageUrl: `https://opengraph.githubassets.com/1/${repo.owner.login}/${repo.name}`,
            githubUrl: repo.html_url,
            liveUrl: repo.homepage || null,
            category: 'web',
            status: repo.archived ? 'prototype' : 'production',
            featured: featuredIds.has(repo.id),
            stars: repo.stargazers_count ?? 0,
            forks: repo.forks_count ?? 0,
            views: 0,
            date: new Date(repo.pushed_at ?? repo.updated_at),
            technologies: technologies.length > 0 ? { create: technologies } : undefined,
          },
        });
        created += 1;
        continue;
      }

      await this.prisma.project.update({
        where: { id: existing.id },
        data: {
          stars: repo.stargazers_count ?? existing.stars,
          forks: repo.forks_count ?? existing.forks,
          date: new Date(repo.pushed_at ?? repo.updated_at),
          liveUrl: repo.homepage || existing.liveUrl,
        },
      });
      updated += 1;
    }

    return { total: repos.length, created, updated };
  }

  private async loadGithubProjects() {
    return [];
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
        await tx.projectTechnology.deleteMany({ where: { projectId: id } });
        for (const name of data.technologies) {
          const tech = await tx.technology.upsert({
            where: { name },
            update: {},
            create: { name },
          });
          await tx.projectTechnology.create({
            data: { projectId: id, technologyId: tech.id },
          });
        }
      }

      return tx.project.findUnique({
        where: { id: project.id },
        include: { technologies: { include: { technology: true } } },
      });
    });
  }

  async deleteProject(id: string) {
    return this.prisma.project.delete({ where: { id } });
  }

}
