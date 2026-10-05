import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, ValidateNested } from 'class-validator';

export class MatchResultEntryDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  participantId!: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  score!: number;
}

export class SwapParticipantsDto {
  @ApiProperty({ example: 1, description: 'First participant to swap' })
  @IsInt()
  participantAId!: number;

  @ApiProperty({ example: 2, description: 'Second participant to swap' })
  @IsInt()
  participantBId!: number;
}

export class UpdateMatchResultDto {
  @ApiProperty({ type: [MatchResultEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MatchResultEntryDto)
  results!: MatchResultEntryDto[];
}
