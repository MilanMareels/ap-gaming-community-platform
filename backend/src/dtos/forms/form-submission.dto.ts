import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class SubmitFormAnswerDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  fieldId!: number;

  @ApiPropertyOptional({ example: 'Mijn antwoord' })
  @IsString()
  @IsOptional()
  value?: string;

  @ApiPropertyOptional({ example: ['Optie A', 'Optie B'] })
  @IsArray()
  @IsOptional()
  values?: string[];
}

export class SubmitFormFileDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  fieldId!: number;

  @ApiProperty({ example: 'forms/1/abc123.pdf' })
  @IsString()
  @IsNotEmpty()
  storageKey!: string;

  @ApiProperty({ example: 'document.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName!: string;
}

export class SubmitFormDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsString()
  @IsOptional()
  submitterEmail?: string;

  @ApiPropertyOptional({ example: 'Jan Janssens' })
  @IsString()
  @IsOptional()
  submitterName?: string;

  @ApiProperty({ type: [SubmitFormAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitFormAnswerDto)
  answers!: SubmitFormAnswerDto[];

  @ApiPropertyOptional({ type: [SubmitFormFileDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitFormFileDto)
  @IsOptional()
  files?: SubmitFormFileDto[];
}
