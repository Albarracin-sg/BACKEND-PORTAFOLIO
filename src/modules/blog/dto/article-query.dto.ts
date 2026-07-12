import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const BLOG_SORT = {
  DISCOVER: 'discover',
  RECENT: 'recent',
} as const;

export type BlogSort = (typeof BLOG_SORT)[keyof typeof BLOG_SORT];

export class ArticleQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ enum: Object.values(BLOG_SORT), default: BLOG_SORT.DISCOVER })
  @IsOptional()
  @IsIn(Object.values(BLOG_SORT))
  sort?: BlogSort = BLOG_SORT.DISCOVER;
}
