import { ApiProperty } from '@nestjs/swagger';
import { SectionType } from '@prisma/client';
import { IsDefined, IsEnum, IsInt, IsString, Min } from 'class-validator';

export class CreateSectionDto {
  @ApiProperty()
  @IsString()
  pageId: string;

  @ApiProperty({ enum: SectionType })
  @IsEnum(SectionType)
  type: SectionType;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsDefined()
  content: Record<string, unknown>;
}
