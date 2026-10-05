import { Injectable, Logger, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { DiscordWebhookService } from './discord-webhook.service.js';
import { CreateCommentDto } from '../../dtos/forms/form-comment.dto.js';
import { rename, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface SubmitPayload {
  submitterEmail?: string;
  submitterName?: string;
  answers: Array<{
    fieldId: number;
    value?: string;
    values?: string[];
  }>;
}

interface FileInfo {
  fieldId: number;
  filePath: string;
  fileName: string;
}

@Injectable()
export class FormSubmissionsService {
  private readonly logger = new Logger('FormSubmissionsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly discordWebhookService: DiscordWebhookService,
  ) {}

  async submitForm(
    formCuid: string,
    payload: SubmitPayload,
    userId: number | null,
    files: FileInfo[],
  ) {
    const form = await this.prisma.dynamicForm.findUnique({
      where: { cuid: formCuid },
      include: { fields: { orderBy: { position: 'asc' } } },
    });

    if (!form) throw new NotFoundException('Form not found');
    if (!form.isActive) throw new BadRequestException('This form is no longer active');
    if (form.requiresAuth && !userId) throw new UnauthorizedException('Login required to submit this form');

    // Resolve submitter info from user if authenticated
    let submitterEmail = payload.submitterEmail;
    let submitterName = payload.submitterName;
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        submitterEmail = submitterEmail || user.email;
        submitterName = submitterName || user.name || undefined;
      }
    }

    // Validate file extensions
    for (const file of files) {
      const field = form.fields.find((f) => f.id === file.fieldId);
      if (!field || field.type !== 'FILE_UPLOAD') continue;

      const config = field.config as { allowedExtensions?: string[] } | null;
      if (config?.allowedExtensions?.length) {
        const ext = path.extname(file.fileName).toLowerCase();
        if (!config.allowedExtensions.includes(ext)) {
          throw new BadRequestException(`File extension ${ext} is not allowed for field "${field.label}"`);
        }
      }
    }

    // Move files from temp to permanent location
    const formUploadDir = path.join(process.cwd(), 'uploads', 'forms', String(form.id));
    if (files.length > 0 && !existsSync(formUploadDir)) {
      await mkdir(formUploadDir, { recursive: true });
    }

    const movedFiles: FileInfo[] = [];
    for (const file of files) {
      const fileName = path.basename(file.filePath);
      const newPath = path.join('uploads', 'forms', String(form.id), fileName);
      const absoluteNewPath = path.join(process.cwd(), newPath);
      await rename(path.join(process.cwd(), file.filePath), absoluteNewPath);
      movedFiles.push({ ...file, filePath: newPath });
    }

    // Create submission with answers
    const submission = await this.prisma.dynamicFormSubmission.create({
      data: {
        formId: form.id,
        userId,
        submitterEmail,
        submitterName,
        answers: {
          create: [
            ...payload.answers
              .filter((a) => {
                const field = form.fields.find((f) => f.id === a.fieldId);
                return field && field.type !== 'FILE_UPLOAD' && field.type !== 'TEXT_BLOCK';
              })
              .map((a) => ({
                fieldId: a.fieldId,
                value: a.value ?? null,
                values: a.values ?? undefined,
              })),
            ...movedFiles.map((f) => ({
              fieldId: f.fieldId,
              filePath: f.filePath,
              fileName: f.fileName,
            })),
          ],
        },
      },
      include: { answers: { include: { field: true } } },
    });

    // Send confirmation email (fire-and-forget)
    if (form.confirmationEmail && submitterEmail) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      this.mailService
        .sendMail(submitterEmail, `Bevestiging: ${form.title} - AP Gaming Hub`, 'forms/submission-confirmation', {
          formTitle: form.title,
          submitterName: submitterName || submitterEmail,
          submissionDate: new Date().toLocaleDateString('nl-BE'),
          submissionUrl: `${frontendUrl}/forms/submission/${submission.cuid}`,
        })
        .catch((err) => this.logger.error(`Failed to send confirmation email: ${err}`));
    }

    // Send Discord webhook (fire-and-forget)
    if (form.discordWebhookUrl) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const adminUrl = `${frontendUrl}/admin/forms/${form.id}/submissions`;

      this.discordWebhookService
        .sendSubmissionNotification(
          form.discordWebhookUrl,
          form.title,
          submitterName || submitterEmail || 'Anoniem',
          adminUrl,
        )
        .catch((err) => this.logger.error(`Discord webhook failed: ${err}`));
    }

    return { success: true, submissionCuid: submission.cuid };
  }

  async getSubmissions(formId: number) {
    return this.prisma.dynamicFormSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
    });
  }

  async getSubmissionById(submissionId: number) {
    const submission = await this.prisma.dynamicFormSubmission.findUnique({
      where: { id: submissionId },
      include: {
        form: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, email: true } },
        answers: { include: { field: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async getSubmissionByCuid(cuid: string, requestUserId: number | null) {
    const submission = await this.prisma.dynamicFormSubmission.findUnique({
      where: { cuid },
      include: {
        form: { select: { id: true, title: true, requiresAuth: true } },
        answers: { include: { field: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    // If the form requires auth, only the submitter (or admins via the admin endpoint) can view
    if (submission.form.requiresAuth) {
      if (!requestUserId || requestUserId !== submission.userId) {
        throw new UnauthorizedException('Je hebt geen toegang tot deze inzending.');
      }
    }

    return submission;
  }

  async deleteSubmission(submissionId: number) {
    await this.prisma.dynamicFormSubmission.delete({ where: { id: submissionId } });
  }

  async addAdminComment(submissionId: number, userId: number, dto: CreateCommentDto) {
    const submission = await this.prisma.dynamicFormSubmission.findUnique({
      where: { id: submissionId },
      include: { form: { select: { title: true } } },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const comment = await this.prisma.dynamicFormSubmissionComment.create({
      data: {
        submissionId,
        userId,
        content: dto.content,
        isAdmin: true,
        authorName: user?.name || undefined,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    // Send email notification to submitter (fire-and-forget)
    if (submission.submitterEmail) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      this.mailService
        .sendMail(submission.submitterEmail, `Nieuwe reactie: ${submission.form.title} - AP Gaming Hub`, 'forms/new-comment', {
          formTitle: submission.form.title,
          commenterName: user?.name || 'Admin',
          commentPreview: dto.content.slice(0, 200),
          submissionUrl: `${frontendUrl}/forms/submission/${submission.cuid}`,
        })
        .catch((err) => this.logger.error(`Failed to send comment notification email: ${err}`));
    }

    return comment;
  }

  async addPublicComment(submissionCuid: string, dto: CreateCommentDto, userId: number | null) {
    const submission = await this.prisma.dynamicFormSubmission.findUnique({
      where: { cuid: submissionCuid },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    let authorName = 'Anoniem';
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.name) authorName = user.name;
    }

    return this.prisma.dynamicFormSubmissionComment.create({
      data: {
        submissionId: submission.id,
        userId: userId ?? undefined,
        content: dto.content,
        isAdmin: false,
        authorName,
      },
    });
  }
}
