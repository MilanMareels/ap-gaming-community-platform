import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export enum FormFieldTypeDto {
  SHORT_TEXT = 'SHORT_TEXT',
  LONG_TEXT = 'LONG_TEXT',
  SELECT = 'SELECT',
  CHECKBOX = 'CHECKBOX',
  FILE_UPLOAD = 'FILE_UPLOAD',
  TEXT_BLOCK = 'TEXT_BLOCK',
}

export class CreateFormFieldDto {
  @ApiProperty({ enum: FormFieldTypeDto, example: FormFieldTypeDto.SHORT_TEXT })
  @IsEnum(FormFieldTypeDto)
  @IsNotEmpty()
  type!: FormFieldTypeDto;

  @ApiProperty({ example: 'Wat is je naam?' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @ApiProperty({ example: 0 })
  @IsInt()
  position!: number;

  @ApiPropertyOptional({ example: { options: ['Optie A', 'Optie B'] } })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}

export class UpdateFormFieldDto {
  @ApiPropertyOptional({ enum: FormFieldTypeDto })
  @IsEnum(FormFieldTypeDto)
  @IsOptional()
  type?: FormFieldTypeDto;

  @ApiPropertyOptional({ example: 'Updated label' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({ example: { options: ['A', 'B', 'C'] } })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}

export class ReorderFieldItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id!: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  position!: number;
}

export class ReorderFormFieldsDto {
  @ApiProperty({ type: [ReorderFieldItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderFieldItemDto)
  items!: ReorderFieldItemDto[];
}
