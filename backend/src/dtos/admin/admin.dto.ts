import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({
    example: 'admin@student.ap.be',
    description: 'Student email address (used as the User account email)',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 's123456', description: 'Student number' })
  @IsString()
  @IsNotEmpty()
  sNumber!: string;

  @ApiProperty({
    example: 'admin@gmail.com',
    description: 'Gmail address used for Google SSO login',
  })
  @IsEmail()
  @IsNotEmpty()
  gmailEmail!: string;
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
