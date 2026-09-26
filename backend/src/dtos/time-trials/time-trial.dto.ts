import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum TimeTrialStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export class UpdateTimeTrialStatusDto {
  @ApiProperty({ enum: TimeTrialStatus, example: TimeTrialStatus.COMPLETED })
  @IsEnum(TimeTrialStatus)
  @IsNotEmpty()
  status!: TimeTrialStatus;
}
