import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreatePageDto {
  @ApiProperty({ example: 'home' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'Home' })
  @IsString()
  title: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
