import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DiagramsService } from './diagrams.service';
import { CreateDiagramDto } from './dto/create-diagram.dto';
import { UpdateDiagramDto } from './dto/update-diagram.dto';

@ApiTags('admin-diagrams')
@ApiBearerAuth()
@Controller('admin/projects/:projectId/diagrams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DiagramsAdminController {
  constructor(private readonly diagramsService: DiagramsService) {}

  @Get()
  listDiagrams(@Param('projectId') projectId: string) {
    return this.diagramsService.listAdminDiagrams(projectId);
  }

  @Get(':id')
  getDiagram(@Param('id') id: string) {
    return this.diagramsService.getDiagram(id);
  }

  @Post()
  createDiagram(
    @Param('projectId') projectId: string,
    @Body() body: CreateDiagramDto,
  ) {
    return this.diagramsService.createDiagram(projectId, body);
  }

  @Put(':id')
  updateDiagram(
    @Param('id') id: string,
    @Body() body: UpdateDiagramDto,
  ) {
    return this.diagramsService.updateDiagram(id, body);
  }

  @Delete(':id')
  deleteDiagram(@Param('id') id: string) {
    return this.diagramsService.deleteDiagram(id);
  }

  @Put('reorder')
  reorderDiagrams(
    @Param('projectId') projectId: string,
    @Body('diagramIds') diagramIds: string[],
  ) {
    return this.diagramsService.reorderDiagrams(projectId, diagramIds);
  }
}
