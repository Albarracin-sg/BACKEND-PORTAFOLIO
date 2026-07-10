import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class I18nTextDto {
  @ApiProperty({ example: 'Título en español' })
  @IsString()
  @IsNotEmpty()
  es: string;

  @ApiProperty({ example: 'Title in English' })
  @IsString()
  @IsNotEmpty()
  en: string;
}
