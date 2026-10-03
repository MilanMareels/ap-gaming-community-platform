import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class StatisticsQueryDto {
  @ApiProperty({ required: false, example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({ required: false, example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class DailyCountDto {
  @ApiProperty({ example: '2026-10-01' })
  date!: string;

  @ApiProperty({ example: 12 })
  count!: number;
}

export class WeekdayCountDto {
  @ApiProperty({ example: 1 })
  day!: number;

  @ApiProperty({ example: 'Maandag' })
  label!: string;

  @ApiProperty({ example: 18.5 })
  avg!: number;
}

export class HourSlotDto {
  @ApiProperty({ example: 14 })
  hour!: number;

  @ApiProperty({ example: 'Maandag' })
  day!: string;

  @ApiProperty({ example: 8 })
  count!: number;
}

export class HardwareCountDto {
  @ApiProperty({ example: 'pc' })
  inventory!: string;

  @ApiProperty({ example: 42 })
  count!: number;
}

export class HardwareOverTimeDto {
  @ApiProperty({ example: '2026-W40' })
  week!: string;

  @ApiProperty({ example: 10 })
  pc!: number;

  @ApiProperty({ example: 5 })
  ps5!: number;

  @ApiProperty({ example: 3 })
  switch!: number;
}

export class StatusBreakdownDto {
  @ApiProperty({ example: 'PRESENT' })
  status!: string;

  @ApiProperty({ example: 85 })
  count!: number;

  @ApiProperty({ example: 42.5 })
  percentage!: number;
}

export class StatusOverTimeDto {
  @ApiProperty({ example: '2026-W40' })
  week!: string;

  @ApiProperty({ example: 80 })
  showRate!: number;

  @ApiProperty({ example: 10 })
  noShowRate!: number;

  @ApiProperty({ example: 10 })
  cancelRate!: number;
}

export class UtilizationDto {
  @ApiProperty({ example: 'pc' })
  inventory!: string;

  @ApiProperty({ example: 75.5 })
  utilizationPercent!: number;

  @ApiProperty({ example: 6 })
  maxCapacity!: number;
}

export class DurationBucketDto {
  @ApiProperty({ example: '1h' })
  label!: string;

  @ApiProperty({ example: 30 })
  count!: number;
}

export class RepeatUserDto {
  @ApiProperty({ example: 120 })
  totalUsers!: number;

  @ApiProperty({ example: 45 })
  repeatUsers!: number;

  @ApiProperty({ example: 37.5 })
  repeatPercent!: number;
}

export class NewVsReturningDto {
  @ApiProperty({ example: '2026-W40' })
  week!: string;

  @ApiProperty({ example: 5 })
  newUsers!: number;

  @ApiProperty({ example: 12 })
  returningUsers!: number;
}

export class CapacityPressureDto {
  @ApiProperty({ example: '14:00' })
  slot!: string;

  @ApiProperty({ example: 6 })
  maxCapacity!: number;

  @ApiProperty({ example: 4.2 })
  avgBookings!: number;

  @ApiProperty({ example: 3 })
  timesAtCapacity!: number;
}

export class TopUserDto {
  @ApiProperty({ example: 1 })
  userId!: number;

  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiProperty({ example: 'john@student.ap.be' })
  email!: string;

  @ApiProperty({ example: 's123456' })
  sNumber!: string;

  @ApiProperty({ example: 25 })
  totalReservations!: number;

  @ApiProperty({ example: 85.0 })
  showRate!: number;

  @ApiProperty({ example: 5.0 })
  noShowRate!: number;
}

export class UserInfoDto {
  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiProperty({ example: 'john@student.ap.be' })
  email!: string;

  @ApiProperty({ example: 's123456' })
  sNumber!: string;
}

export class MonthlyCountDto {
  @ApiProperty({ example: '2026-10' })
  month!: string;

  @ApiProperty({ example: 8 })
  count!: number;
}

export class HourCountDto {
  @ApiProperty({ example: 14 })
  hour!: number;

  @ApiProperty({ example: 5 })
  count!: number;
}

export class UserStatisticsDto {
  @ApiProperty({ type: UserInfoDto })
  user!: UserInfoDto;

  @ApiProperty({ example: 25 })
  totalReservations!: number;

  @ApiProperty({ example: 85.0 })
  showRate!: number;

  @ApiProperty({ example: 5.0 })
  noShowRate!: number;

  @ApiProperty({ example: 10.0 })
  cancelRate!: number;

  @ApiProperty({ example: 60 })
  avgDurationMinutes!: number;

  @ApiProperty({ example: 1.5 })
  avgControllers!: number;

  @ApiProperty({ type: [HardwareCountDto] })
  hardwareBreakdown!: HardwareCountDto[];

  @ApiProperty({ type: [MonthlyCountDto] })
  reservationsOverTime!: MonthlyCountDto[];

  @ApiProperty({ type: [HourCountDto] })
  preferredSlots!: HourCountDto[];
}

export class ReservationStatisticsDto {
  @ApiProperty({ type: [DailyCountDto] })
  dailyCounts!: DailyCountDto[];

  @ApiProperty({ type: [WeekdayCountDto] })
  weekdayAverages!: WeekdayCountDto[];

  @ApiProperty({ type: [HourSlotDto] })
  peakHoursHeatmap!: HourSlotDto[];

  @ApiProperty({ type: [HardwareCountDto] })
  hardwareBreakdown!: HardwareCountDto[];

  @ApiProperty({ type: [HardwareOverTimeDto] })
  hardwareOverTime!: HardwareOverTimeDto[];

  @ApiProperty({ example: 1.8 })
  avgControllersPerReservation!: number;

  @ApiProperty({ type: [UtilizationDto] })
  utilization!: UtilizationDto[];

  @ApiProperty({ type: [StatusBreakdownDto] })
  statusBreakdown!: StatusBreakdownDto[];

  @ApiProperty({ type: [StatusOverTimeDto] })
  statusOverTime!: StatusOverTimeDto[];

  @ApiProperty({ type: [DurationBucketDto] })
  durationDistribution!: DurationBucketDto[];

  @ApiProperty({ type: RepeatUserDto })
  repeatUsers!: RepeatUserDto;

  @ApiProperty({ type: [NewVsReturningDto] })
  newVsReturning!: NewVsReturningDto[];

  @ApiProperty({ type: [CapacityPressureDto] })
  capacityPressure!: CapacityPressureDto[];

  @ApiProperty({ type: [TopUserDto] })
  topUsers!: TopUserDto[];
}
