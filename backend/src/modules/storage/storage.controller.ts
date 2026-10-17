import { Controller, Get, Post, Body, Param, Req, Res, UseGuards, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Public } from '../auth/public.decorator.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { StorageService } from './storage.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import type { Request, Response } from 'express';

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

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
/** Form attachments, uploadable by any logged-in user submitting a form. */
const FORM_UPLOAD_KEY = new RegExp(`^forms/\\d+/${UUID}\\.[^/]{1,64}$`);
/** Roster player photos, uploadable by roster managers. */
const ROSTER_UPLOAD_KEY = new RegExp(`^rosters/roster-${UUID}\\.[^/]{1,64}$`);

@ApiTags('Files')
@Controller('files')
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly rbacService: RbacService,
  ) {}

  /**
   * Downloads are public for anyone holding a key, so keys must stay unguessable: uploads are limited
   * to random (UUID) keys under the app's own prefixes and may never overwrite an existing file.
   */
  @Post('upload-url')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a presigned URL for direct upload to S3' })
  async getUploadUrl(@Body() dto: RequestUploadUrlDto, @Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (ROSTER_UPLOAD_KEY.test(dto.key)) {
      if (!(await this.rbacService.hasAnyPermission(user, ['roster.manage']))) {
        throw new ForbiddenException('Access denied. Required permission: roster.manage');
      }
    } else if (!FORM_UPLOAD_KEY.test(dto.key)) {
      throw new BadRequestException('Invalid upload key');
    }
    if (await this.storageService.exists(dto.key)) {
      throw new ConflictException('A file with this key already exists');
    }

    const url = await this.storageService.getSignedUploadUrl(dto.key, dto.contentType);
    return { url, key: dto.key };
  }

  @Public()
  @Get('*key')
  @ApiOperation({ summary: 'Download a file (redirects to presigned S3 URL)' })
  async getFile(@Param('key') key: string | string[], @Res() res: Response) {
    // NestJS may deliver the wildcard as an array of segments or a string
    const resolvedKey = Array.isArray(key) ? key.join('/') : key;

    const fileExists = await this.storageService.exists(resolvedKey);
    if (!fileExists) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    const url = await this.storageService.getSignedDownloadUrl(resolvedKey, 3600);
    res.redirect(302, url);
  }
}
