import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

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
}
