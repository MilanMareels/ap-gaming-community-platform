import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { Liquid } from 'liquidjs';
import { createTransport, Transporter } from 'nodemailer';
import path from 'path';
import mjml from 'mjml';
import QRCode from 'qrcode';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: Transporter;
  private readonly logger = new Logger('MailService');
  private readonly liquid = new Liquid();

  async onModuleInit() {
    this.transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await this.transporter.verify();
    this.logger.log('SMTP connection established');
  }

  async sendMail(to: string, subject: string, templateName: string, data: Record<string, any>) {
    const templatePath = path.join(process.cwd(), 'src/mail-templates', `${templateName}.mjml`);

    const mjmlTemplate = await readFile(templatePath, 'utf-8');
    const template = await this.liquid.parseAndRender(mjmlTemplate, data);
    const { html, errors } = mjml(template);

    if (errors && errors.length > 0) {
      throw new Error(`MJML template error: ${errors.map((e) => e.formattedMessage).join(', ')}`);
    }

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@apgaming.be',
      to,
      subject,
      html,
    });

    this.logger.log(`Email sent to ${to}`);
  }

  async sendMailWithAttachments(
    to: string,
    subject: string,
    templateName: string,
    data: Record<string, any>,
    attachments: Array<{
      filename: string;
      content: Buffer;
      cid?: string;
    }>,
  ) {
    const templatePath = path.join(process.cwd(), 'src/mail-templates', `${templateName}.mjml`);

    const mjmlTemplate = await readFile(templatePath, 'utf-8');
    const template = await this.liquid.parseAndRender(mjmlTemplate, data);
    const { html, errors } = mjml(template);

    if (errors && errors.length > 0) {
      throw new Error(`MJML template error: ${errors.map((e) => e.formattedMessage).join(', ')}`);
    }

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@apgaming.be',
      to,
      subject,
      html,
      attachments,
    });

    this.logger.log(`Email with attachments sent to ${to}`);
  }

  async generateQRCode(data: string): Promise<Buffer> {
    return QRCode.toBuffer(data, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 400,
      margin: 2,
    });
  }
}
