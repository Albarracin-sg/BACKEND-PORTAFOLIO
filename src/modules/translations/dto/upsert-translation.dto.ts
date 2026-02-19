import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';

export class UpsertTranslationDto {
  @ApiProperty({ example: 'es' })
  @IsString()
  lang: string;

  @ApiProperty({ example: 'hero' })
  @IsString()
  namespace: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsDefined()
  content: Record<string, unknown>;
}
