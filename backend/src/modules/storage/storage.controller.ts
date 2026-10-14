import { Controller, Get, Post, Body, Param, Res, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Public } from '../auth/public.decorator.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { StorageService } from './storage.service.js';
import type { Response } from 'express';

class RequestUploadUrlDto {
  @ApiProperty({ example: 'forms/1/photo.jpg' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @IsOptional()
  contentType?: string;
}

@ApiTags('Files')
@Controller('files')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a presigned URL for direct upload to S3' })
  async getUploadUrl(@Body() dto: RequestUploadUrlDto) {
    const url = await this.storageService.getSignedUploadUrl(dto.key, dto.contentType);
    return { url, key: dto.key };
  }

  @Public()
  @Get('*key')
  @ApiOperation({ summary: 'Download a file (redirects to presigned S3 URL)' })
  async getFile(@Param('key') key: string, @Res() res: Response) {
    const fileExists = await this.storageService.exists(key);
    if (!fileExists) {
      throw new NotFoundException('File not found');
    }

    const url = await this.storageService.getSignedDownloadUrl(key, 3600);
    res.redirect(302, url);
  }
}
