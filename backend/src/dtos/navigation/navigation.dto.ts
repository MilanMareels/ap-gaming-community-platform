import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreateNavLinkDto {
  @ApiProperty({ example: 'Events' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiPropertyOptional({ example: '/events' })
  @IsString()
  @IsOptional()
  href?: string;

  @ApiPropertyOptional({ example: 'Calendar' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  parentId?: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  position!: number;

  @ApiPropertyOptional({ example: 'public', enum: ['public', 'authenticated', 'admin'] })
  @IsIn(['public', 'authenticated', 'admin'])
  @IsOptional()
  visibility?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isCta?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  openInNewTab?: boolean;
}

export class UpdateNavLinkDto {
  @ApiPropertyOptional({ example: 'Events' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ example: '/events' })
  @IsString()
  @IsOptional()
  href?: string | null;

  @ApiPropertyOptional({ example: 'Calendar' })
  @IsString()
  @IsOptional()
  icon?: string | null;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  parentId?: number | null;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({ example: 'public', enum: ['public', 'authenticated', 'admin'] })
  @IsIn(['public', 'authenticated', 'admin'])
  @IsOptional()
  visibility?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isCta?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  openInNewTab?: boolean;
}

export class ReorderItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id!: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  position!: number;
}

export class ReorderNavLinksDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}
