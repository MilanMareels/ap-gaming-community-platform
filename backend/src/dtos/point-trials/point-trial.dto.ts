import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum PointTrialStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export class UpdatePointTrialStatusDto {
  @ApiProperty({ enum: PointTrialStatus, example: PointTrialStatus.COMPLETED })
  @IsEnum(PointTrialStatus)
  @IsNotEmpty()
  status!: PointTrialStatus;
}
