import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { I18nTextDto } from '../../../common/dto/i18n-text.dto';

export class CreateArticleDto {
  @ApiProperty({ type: I18nTextDto })
  @IsObject()
  @ValidateNested()
  @Type(() => I18nTextDto)
  @IsNotEmpty()
  title: I18nTextDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false, type: I18nTextDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => I18nTextDto)
  excerpt?: I18nTextDto;

  @ApiProperty({ type: I18nTextDto })
  @IsObject()
  @ValidateNested()
  @Type(() => I18nTextDto)
  @IsNotEmpty()
  content: I18nTextDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiProperty({ required: false, default: 'Juan Camilo Albarracín Urrego' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({ required: false, type: I18nTextDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => I18nTextDto)
  metaTitle?: I18nTextDto;

  @ApiProperty({ required: false, type: I18nTextDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => I18nTextDto)
  metaDescription?: I18nTextDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
