import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

interface ProjectQuery {
  search?: string;
  category?: string;
  tech?: string;
  sortBy?: 'date' | 'stars' | 'name' | 'views';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicProjects(query: ProjectQuery) {
    const { search, category, tech, sortBy = 'date', sortOrder = 'desc' } = query;

    const orderBy: Prisma.ProjectOrderByWithRelationInput =
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
