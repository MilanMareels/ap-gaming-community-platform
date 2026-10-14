import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { FormSubmissionsService } from './form-submissions.service.js';
import { FormsService } from './forms.service.js';
import { SubmitFormDto } from '../../dtos/forms/form-submission.dto.js';
import { CreateCommentDto } from '../../dtos/forms/form-comment.dto.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { RbacService } from '../rbac/rbac.service.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';

@ApiTags('Form Submissions')
@Controller('forms')
export class FormSubmissionsController {
  constructor(
    private readonly submissionsService: FormSubmissionsService,
    private readonly formsService: FormsService,
    private readonly rbacService: RbacService,
  ) {}

  // --- Public submission ---

  @UseGuards(JwtAuthGuard)
  @Public()
  @Post('public/:cuid/submit')
  @ApiOperation({ summary: 'Submit a form response' })
  async submitForm(
    @Param('cuid') cuid: string,
    @Req() req: Request,
    @Body() dto: SubmitFormDto,
  ) {
    const user = (req as Request & { user?: JwtPayload }).user;

    return this.submissionsService.submitForm(
      cuid,
      {
        submitterEmail: dto.submitterEmail,
        submitterName: dto.submitterName,
        answers: dto.answers ?? [],
        files: dto.files,
      },
      user?.sub ?? null,
    );
  }

  // --- Admin endpoints ---

  @Get('admin/submissions')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage', 'forms.submissions.view')
  @ApiOperation({ summary: 'List all accessible submissions across forms' })
  async getAllSubmissions(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = (req as Request & { user?: JwtPayload }).user!;
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 25));
    const permissions = await this.rbacService.getPermissionsForUser(user.sub);
    if (permissions.has('forms.manage')) {
      return this.submissionsService.getAllSubmissions(p, l);
    }
    return this.submissionsService.getAccessibleSubmissions(user.sub, p, l);
  }

  @Get(':id/submissions')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage', 'forms.submissions.view')
  @ApiOperation({ summary: 'List submissions for a form' })
  async getSubmissions(
    @Param('id') id: string,
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = (req as Request & { user?: JwtPayload }).user!;
    await this.assertFormAccess(user.sub, +id);
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 25));
    return this.submissionsService.getSubmissions(+id, p, l);
  }

  @Get('submissions/:submissionId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage', 'forms.submissions.view')
  @ApiOperation({ summary: 'Get a single submission with answers' })
  async getSubmissionById(@Param('submissionId') submissionId: string, @Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user!;
    const submission = await this.submissionsService.getSubmissionById(+submissionId);
    await this.assertFormAccess(user.sub, submission.form.id);
    return submission;
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
  @RequirePermissions('forms.manage', 'forms.submissions.view')
  @ApiOperation({ summary: 'Add admin comment to a submission' })
  async addAdminComment(
    @Param('submissionId') submissionId: string,
    @Req() req: Request,
    @Body() dto: CreateCommentDto,
  ) {
    const user = (req as Request & { user?: JwtPayload }).user!;
    const submission = await this.submissionsService.getSubmissionById(+submissionId);
    await this.assertFormAccess(user.sub, submission.form.id);
    return this.submissionsService.addAdminComment(+submissionId, user.sub, dto);
  }

  @Get('submissions/:submissionId/comments')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('forms.manage', 'forms.submissions.view')
  @ApiOperation({ summary: 'Get comments for a submission' })
  async getAdminComments(@Param('submissionId') submissionId: string, @Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user!;
    const submission = await this.submissionsService.getSubmissionById(+submissionId);
    await this.assertFormAccess(user.sub, submission.form.id);
    return submission.comments;
  }

  /**
   * If the user only has forms.submissions.view (not forms.manage),
   * verify they have access to this specific form via DynamicFormAccess.
   */
  private async assertFormAccess(userId: number, formId: number) {
    const permissions = await this.rbacService.getPermissionsForUser(userId);
    if (permissions.has('forms.manage')) return;
    const hasAccess = await this.formsService.canUserAccessForm(userId, formId);
    if (!hasAccess) throw new ForbiddenException('Je hebt geen toegang tot dit formulier.');
  }

  // --- Public submission viewer ---

  @UseGuards(JwtAuthGuard)
  @Public()
  @Get('submission/:cuid')
  @ApiOperation({ summary: 'Get submission with comments (public viewer)' })
  getPublicSubmission(@Param('cuid') cuid: string, @Req() req: Request) {
    const user = (req as Request & { user?: JwtPayload }).user;
    return this.submissionsService.getSubmissionByCuid(cuid, user?.sub ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Public()
  @Post('submission/:cuid/comments')
  @ApiOperation({ summary: 'Add comment to submission (public)' })
  addPublicComment(@Param('cuid') cuid: string, @Req() req: Request, @Body() dto: CreateCommentDto) {
    const user = (req as Request & { user?: JwtPayload }).user;
    return this.submissionsService.addPublicComment(cuid, dto, user?.sub ?? null);
  }
}
