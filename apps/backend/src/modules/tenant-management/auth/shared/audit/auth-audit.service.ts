import { Injectable } from '@nestjs/common';
import { JsonValue } from '@prisma/client/runtime/client';
import { PrismaService } from 'src/core/database/prisma.service';
import { V2AuthAuditEventType } from 'src/generated/prisma/enums';

@Injectable()
export class AuthAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    userId?: string | null;
    type: V2AuthAuditEventType;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      // SAFETY: This value is composed only of JSON-compatible primitives, arrays, and objects before it crosses the Prisma JSON boundary.
      await this.prisma.client.v2AuthAuditEvent.create({
        data: {
          userId: input.userId ?? null,
          type: input.type,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          metadata: (input.metadata as JsonValue) ?? undefined,
        },
      });
    } catch {
      // Audit logging should not break the authentication flow.
    }
  }
}
