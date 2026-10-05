import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, UseInterceptors, UploadedFiles, OnModuleInit } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import type { Request } from 'express';
import { FormSubmissionsService } from './form-submissions.service.js';
import { CreateCommentDto } from '../../dtos/forms/form-comment.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { Public } from '../auth/public.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

const TEMP_UPLOAD_DIR = join(process.cwd(), 'uploads', 'forms', 'temp');

@ApiTags('Form Submissions')
@Controller('forms')
export class FormSubmissionsController implements OnModuleInit {
  constructor(private readonly submissionsService: FormSubmissionsService) {}

  onModuleInit() {
    if (!existsSync(TEMP_UPLOAD_DIR)) {
      mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
    }
  }

  // --- Public submission ---

  @Public()
  @Post('public/:cuid/submit')
  @ApiOperation({ summary: 'Submit a form response' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads/forms/temp',
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async submitForm(
    @Param('cuid') cuid: string,
    @Req() req: Request,
    @UploadedFiles() uploadedFiles?: Express.Multer.File[],
  ) {
    const user = (req as Request & { user?: JwtPayload }).user;
    const body = req.body as Record<string, string>;

    const answers = body.answers ? JSON.parse(body.answers) : [];
    const fileFieldMapping: Record<string, number> = body.fileFieldMapping ? JSON.parse(body.fileFieldMapping) : {};

    const files = (uploadedFiles || []).map((file, index) => ({
      fieldId: fileFieldMapping[String(index)],
      filePath: `uploads/forms/temp/${file.filename}`,
      fileName: file.originalname,
    }));

    return this.submissionsService.submitForm(
      cuid,
      {
        submitterEmail: body.submitterEmail,
        submitterName: body.submitterName,
        answers,
      },
      user?.sub ?? null,
      files,
    );
  }

  // --- Admin endpoints ---

  @Get(':id/submissions')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage')
  @ApiOperation({ summary: 'List submissions for a form (Admin only)' })
  getSubmissions(@Param('id') id: string) {
    return this.submissionsService.getSubmissions(+id);
  }

  @Get('submissions/:submissionId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage')
  @ApiOperation({ summary: 'Get a single submission with answers (Admin only)' })
  getSubmissionById(@Param('submissionId') submissionId: string) {
    return this.submissionsService.getSubmissionById(+submissionId);
  }

  @Delete('submissions/:submissionId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage')
  @ApiOperation({ summary: 'Delete a submission (Admin only)' })
  deleteSubmission(@Param('submissionId') submissionId: string) {
    return this.submissionsService.deleteSubmission(+submissionId);
  }

  @Post('submissions/:submissionId/comments')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage')
  @ApiOperation({ summary: 'Add admin comment to a submission' })
  addAdminComment(
    @Param('submissionId') submissionId: string,
    @Req() req: Request,
    @Body() dto: CreateCommentDto,
  ) {
    const user = (req as Request & { user?: JwtPayload }).user;
    return this.submissionsService.addAdminComment(+submissionId, user!.sub, dto);
  }

  // --- Public submission viewer ---

  @Public()
  @Get('submission/:cuid')
  @ApiOperation({ summary: 'Get submission with comments (public viewer)' })
  getPublicSubmission(@Param('cuid') cuid: string, @Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user;
    return this.submissionsService.getSubmissionByCuid(cuid, user?.sub ?? null);
  }

  @Public()
  @Post('submission/:cuid/comments')
  @ApiOperation({ summary: 'Add comment to submission (public)' })
  addPublicComment(@Param('cuid') cuid: string, @Req() req: Request, @Body() dto: CreateCommentDto) {
    const user = (req as Request & { user?: JwtPayload }).user;
    return this.submissionsService.addPublicComment(cuid, dto, user?.sub ?? null);
  }
}
