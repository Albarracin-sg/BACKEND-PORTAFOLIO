import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BlogService } from './blog.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('admin-blog')
@ApiBearerAuth()
@Controller('admin/blog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class BlogAdminController {
  constructor(private readonly blogService: BlogService) {}

  @Get('articles')
  listArticles() {
    return this.blogService.findAllAll(1, 1000);
  }

  @Get('articles/:id')
  getArticle(@Param('id') id: string) {
    return this.blogService.findById(id);
  }

  @Post('articles')
  createArticle(@Body() body: CreateArticleDto) {
    return this.blogService.create(body);
  }

  @Put('articles/:id')
  updateArticle(@Param('id') id: string, @Body() body: UpdateArticleDto) {
    return this.blogService.update(id, body);
  }

  @Delete('articles/:id')
  deleteArticle(@Param('id') id: string) {
    return this.blogService.remove(id);
  }
}
