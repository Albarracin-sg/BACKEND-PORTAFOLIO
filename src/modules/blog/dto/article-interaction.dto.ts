import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const ARTICLE_INTERACTION = {
  OPEN: 'open',
  QUALIFIED_READ: 'qualified-read',
} as const;

export type ArticleInteraction = (typeof ARTICLE_INTERACTION)[keyof typeof ARTICLE_INTERACTION];

export class ArticleInteractionDto {
  @ApiProperty({ enum: Object.values(ARTICLE_INTERACTION) })
  @IsIn(Object.values(ARTICLE_INTERACTION))
  type!: ArticleInteraction;

  @ApiPropertyOptional({ minimum: 0, maximum: 3600 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3600)
  readDurationSeconds?: number;
}
