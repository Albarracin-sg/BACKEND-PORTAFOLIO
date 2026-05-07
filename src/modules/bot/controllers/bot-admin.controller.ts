import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Delete,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { HuggingFaceService } from '../services/huggingface.service';

@ApiTags('Admin Bot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/bot')
export class BotAdminController {
  constructor(private readonly huggingFaceService: HuggingFaceService) {}

  @Get('threads')
  @HttpCode(HttpStatus.OK)
  async listThreads(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('q') q?: string,
  ) {
    return this.huggingFaceService.listThreads(page, limit, q);
  }

  @Post('threads/:id/analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeThread(@Param('id') id: string) {
    return this.huggingFaceService.analyzeThread(id);
  }

  @Post('threads/analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeBulkThreads(@Query('q') q?: string) {
    return this.huggingFaceService.analyzeBulkThreads(q);
  }

  @Get('threads/:id/messages')
  @HttpCode(HttpStatus.OK)
  async listThreadMessages(@Param('id') id: string) {
    return this.huggingFaceService.getThreadMessages(id);
  }

  @Delete('threads/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteThread(@Param('id') id: string) {
    await this.huggingFaceService.clearConversation(id);
  }
}
