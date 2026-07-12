import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BlogService } from './blog.service';
import { ArticleQueryDto } from './dto/article-query.dto';
import { ArticleInteractionDto } from './dto/article-interaction.dto';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';

@ApiTags('public-blog')
@Controller('public/blog')
export class BlogPublicController {
  constructor(private readonly blogService: BlogService) {}

  @Get('articles')
  @RateLimit('blog')
  @UseGuards(RateLimitGuard)
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  listArticles(@Query() query: ArticleQueryDto) {
    return this.blogService.findAll(
      true,
      query.page ?? 1,
      query.limit ?? 10,
      query.tag,
      query.projectId,
      query.sort,
    );
  }

  @Get('articles/home')
  @RateLimit('blog')
  @UseGuards(RateLimitGuard)
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  listForHome() {
    return this.blogService.findForHome();
  }

  @Get('articles/featured')
  @RateLimit('blog')
  @UseGuards(RateLimitGuard)
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  listFeatured() {
    return this.blogService.findFeatured();
  }

  @Get('articles/:slug')
  @Header('Cache-Control', 'no-store')
  getArticle(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }

  @Post('articles/:id/interactions')
  @RateLimit('blog')
  @UseGuards(RateLimitGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async trackInteraction(@Param('id') id: string, @Body() body: ArticleInteractionDto) {
    await this.blogService.recordInteraction(id, body.type, body.readDurationSeconds);
  }

  @Get('tags')
  @RateLimit('blog')
  @UseGuards(RateLimitGuard)
  @Header('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200')
  listTags() {
    return this.blogService.findAllTags();
  }
}
