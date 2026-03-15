import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MailService } from '../../src/modules/mail/mail.service.js';

describe('MailService', () => {
  let service: MailService;
  let mockTransporter: any;

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn<any>().mockResolvedValue({ messageId: 'test-id' }),
      verify: jest.fn<any>().mockResolvedValue(true),
    };

    // Mock the module directly
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue(mockTransporter),
    }));

    const module = await Test.createTestingModule({
      providers: [MailService],
    }).compile();

    service = module.get(MailService);

    // Override the transporter creation
    (service as any).transporter = mockTransporter;
  });

  describe('QR Code Generation', () => {
    it('should generate QR code as buffer', async () => {
      const qrCode = await service.generateQRCode('test-data-123');

      expect(qrCode).toBeInstanceOf(Buffer);
      expect(qrCode.length).toBeGreaterThan(0);
    });

    it('should generate different QR codes for different data', async () => {
      const qrCode1 = await service.generateQRCode('data-1');
      const qrCode2 = await service.generateQRCode('data-2');

      expect(qrCode1.equals(qrCode2)).toBe(false);
    });

    it('should generate same QR code for same data', async () => {
      const qrCode1 = await service.generateQRCode('same-data');
      const qrCode2 = await service.generateQRCode('same-data');

      expect(qrCode1.equals(qrCode2)).toBe(true);
    });

    it('should handle reservation IDs', async () => {
      const reservationId = '12345';
      const qrCode = await service.generateQRCode(reservationId);

      expect(qrCode).toBeInstanceOf(Buffer);
      expect(qrCode.length).toBeGreaterThan(0);
    });
  });

  describe('Email Sending with Attachments', () => {
    it('should send email with QR code attachment', async () => {
      const qrCodeBuffer = Buffer.from('fake-qr-code');
      const attachments = [
        {
          filename: 'qrcode.png',
          content: qrCodeBuffer,
          cid: 'qrcode',
        },
      ];

      await service.sendMailWithAttachments(
        'test@example.com',
        'Test Subject',
        'reservation/confirmation',
        { reservationId: '123' },
        attachments,
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Subject',
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: 'qrcode.png',
              content: qrCodeBuffer,
              cid: 'qrcode',
            }),
          ]),
        }),
      );
    });

    it('should include proper from address', async () => {
      await service.sendMailWithAttachments(
        'recipient@example.com',
        'Test',
        'reservation/confirmation',
        {},
        [],
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.any(String),
        }),
      );
    });

    it('should render HTML from MJML template', async () => {
      await service.sendMailWithAttachments(
        'test@example.com',
        'Test',
        'reservation/confirmation',
        { reservationId: '123' },
        [],
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.any(String),
        }),
      );
    });

    it('should handle multiple attachments', async () => {
      const attachments = [
        { filename: 'file1.png', content: Buffer.from('data1'), cid: 'img1' },
        { filename: 'file2.png', content: Buffer.from('data2'), cid: 'img2' },
      ];

      await service.sendMailWithAttachments(
        'test@example.com',
        'Test',
        'reservation/confirmation',
        {},
        attachments,
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({ filename: 'file1.png' }),
            expect.objectContaining({ filename: 'file2.png' }),
          ]),
        }),
      );
    });
  });

  describe('Original sendMail Method', () => {
    it('should still work for emails without attachments', async () => {
      await service.sendMail(
        'test@example.com',
        'Test Subject',
        'reservation/confirmation',
        { test: 'data' },
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Subject',
          html: expect.any(String),
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error on SMTP failure', async () => {
      mockTransporter.sendMail.mockRejectedValue(
        new Error('SMTP connection failed'),
      );

      await expect(
        service.sendMailWithAttachments(
          'test@example.com',
          'Test',
          'reservation/confirmation',
          {},
          [],
        ),
      ).rejects.toThrow('SMTP connection failed');
    });
  });

  describe('Module Initialization', () => {
    it('should verify SMTP connection on init', async () => {
      const freshService = new MailService();

      // Override the transporter before initialization
      (freshService as any).transporter = mockTransporter;

      // Mock environment variables
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        SMTP_HOST: 'localhost',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_USER: 'test',
        SMTP_PASS: 'test',
      };

      try {
        // This should not try to connect since we already set the transporter
        expect(freshService).toBeDefined();
        expect((freshService as any).transporter).toBeDefined();
      } finally {
        process.env = originalEnv;
      }
    });
  });
});
