import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({ example: 'admin@student.ap.be' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class UpdateSettingDto {
  @ApiProperty({ example: 'googleFormUrl' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ example: 'https://forms.google.com/...' })
  @IsString()
  @IsNotEmpty()
  value!: string;
}
