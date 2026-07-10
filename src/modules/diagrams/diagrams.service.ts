import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDiagramDto } from './dto/create-diagram.dto';
import { UpdateDiagramDto } from './dto/update-diagram.dto';

@Injectable()
export class DiagramsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicDiagrams(projectId: string) {
    return this.prisma.architectureDiagram.findMany({
      where: {
        projectId,
        published: true,
      },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        source: true,
        position: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async listAdminDiagrams(projectId: string) {
    return this.prisma.architectureDiagram.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
    });
  }

  async getDiagram(id: string) {
    const diagram = await this.prisma.architectureDiagram.findUnique({
      where: { id },
    });

    if (!diagram) {
      throw new NotFoundException(`Diagram with ID ${id} not found`);
    }

    return diagram;
  }

  async createDiagram(projectId: string, data: CreateDiagramDto) {
    return this.prisma.architectureDiagram.create({
      data: {
        projectId,
        title: data.title as any,
        description: data.description as any,
        type: data.type,
        source: data.source as any,
        position: data.position ?? 0,
        published: data.published ?? false,
      },
    });
  }

  async updateDiagram(id: string, data: UpdateDiagramDto) {
    const existing = await this.prisma.architectureDiagram.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Diagram with ID ${id} not found`);
    }

    return this.prisma.architectureDiagram.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title as any }),
        ...(data.description !== undefined && { description: data.description as any }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.source !== undefined && { source: data.source as any }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.published !== undefined && { published: data.published }),
      },
    });
  }

  async deleteDiagram(id: string) {
    const existing = await this.prisma.architectureDiagram.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Diagram with ID ${id} not found`);
    }

    return this.prisma.architectureDiagram.delete({
      where: { id },
    });
  }

  async reorderDiagrams(projectId: string, diagramIds: string[]) {
    const updates = diagramIds.map((id, index) =>
      this.prisma.architectureDiagram.update({
        where: { id, projectId },
        data: { position: index },
      }),
    );

    return this.prisma.$transaction(updates);
  }
}
