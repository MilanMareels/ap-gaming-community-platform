import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AddPointTrialParticipantDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  userId?: number;
}

export class AddPointEntryDto {
  @ApiProperty({ example: 150, description: 'Points scored' })
  @IsInt()
  @Min(0)
  points!: number;
}
