import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  problem: string;

  @ApiProperty()
  @IsString()
  challenge: string;

  @ApiProperty()
  @IsString()
  solution: string;

  @ApiProperty()
  @IsString()
  imageUrl: string;

  @ApiProperty()
  @IsString()
  githubUrl: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  liveUrl?: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty({ example: 'production' })
  @IsString()
  status: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  stars?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  forks?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  views?: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  technologies: string[];
}
