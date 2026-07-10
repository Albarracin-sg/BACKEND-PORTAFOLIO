import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiagramType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { I18nTextDto } from '../../../common/dto/i18n-text.dto';

export class CreateDiagramDto {
  @ApiProperty({ type: I18nTextDto })
  @IsObject()
  @ValidateNested()
  @Type(() => I18nTextDto)
  @IsNotEmpty()
  title: I18nTextDto;

  @ApiPropertyOptional({ type: I18nTextDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => I18nTextDto)
  description?: I18nTextDto;

  @ApiProperty({ enum: DiagramType })
  @IsEnum(DiagramType)
  type: DiagramType;

  @ApiProperty({ description: 'React Flow JSON { nodes: [], edges: [] }' })
  @IsObject()
  @IsNotEmpty()
  source: any;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
