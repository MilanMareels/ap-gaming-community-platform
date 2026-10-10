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

  private async renderTemplate(templateName: string, data: Record<string, any>): Promise<string> {
    const templatePath = path.join(process.cwd(), 'src/mail-templates', `${templateName}.mjml`);

    const mjmlTemplate = await readFile(templatePath, 'utf-8');
    // currentYear is available in every template, e.g. for the copyright footer
    const template = await this.liquid.parseAndRender(mjmlTemplate, { currentYear: new Date().getFullYear(), ...data });
    const { html, errors } = await mjml(template);

    if (errors && errors.length > 0) {
      throw new Error(`MJML template error: ${errors.map((e) => e.formattedMessage).join(', ')}`);
    }

    return html;
  }

  async sendMail(to: string, subject: string, templateName: string, data: Record<string, any>) {
    const html = await this.renderTemplate(templateName, data);

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
    const html = await this.renderTemplate(templateName, data);

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
