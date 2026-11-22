import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { createAuditExtension, createAuditRowReader } from '../audit/audit-prisma.extension.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const adapter = new PrismaPg({ connectionString });
    super({ adapter });

    // Every write through this client is recorded in the audit log. The extended client keeps this class's
    // methods, so the rest of the app uses it exactly like before; `this` stays unextended for the reads
    // the audit log does itself.
    return this.$extends(createAuditExtension(createAuditRowReader(this))) as unknown as this;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
