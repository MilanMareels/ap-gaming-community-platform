import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class PersonDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ example: 'Robin Claes', nullable: true, type: String })
  name!: string | null;

  @ApiProperty({ example: 's123456@student.ap.be' })
  email!: string;

  @ApiProperty({ example: 's123456' })
  sNumber!: string;

  @ApiProperty({ example: 4, description: 'Reservations this person has made so far' })
  reservationCount!: number;
}

export class PersonSearchQueryDto {
  @ApiProperty({ example: 'robin', description: 'Part of a name, email address or student number (at least 2 characters)' })
  @IsString()
  @MinLength(2)
  search!: string;
}
