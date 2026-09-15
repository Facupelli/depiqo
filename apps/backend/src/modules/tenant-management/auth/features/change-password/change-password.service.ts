import { Injectable } from '@nestjs/common';
import { err, ok, type Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2AuthAuditEventType } from 'src/generated/prisma/enums';

import { AuthUser, toAuthUser } from '../../shared/auth.types';
import { PasswordService } from '../../shared/password/password.service';
import { ChangePasswordError, changePasswordError } from './change-password.errors';

@Injectable()
export class ChangePasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  execute(input: {
    tenantId: string;
    tenantUserId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<Result<AuthUser, ChangePasswordError>> {
    const context = { useCase: 'ChangePassword', tenantId: input.tenantId, tenantUserId: input.tenantUserId };

    return this.prisma.client.$transaction(async (tx) => {
      const user = await tx.v2TenantUser.findFirst({
        where: { id: input.tenantUserId, tenantId: input.tenantId },
        select: { localCredential: true },
      });
      if (!user?.localCredential) {
        return err(
          changePasswordError(
            'tenant_management.local_credential_not_found',
            'The authenticated account has no local credential.',
            context,
          ),
        );
      }

      const currentPasswordValid = await this.passwordService.verifyPassword({
        password: input.currentPassword,
        hash: user.localCredential.passwordHash,
        algorithm: user.localCredential.passwordAlgorithm,
      });
      if (!currentPasswordValid) {
        return err(
          changePasswordError(
            'tenant_management.current_password_incorrect',
            'The current password is incorrect.',
            context,
          ),
        );
      }

      const password = await this.passwordService.hashPassword(input.newPassword);
      const now = new Date();
      const updated = await tx.v2TenantUser.update({
        where: { id: input.tenantUserId },
        data: {
          mustChangePassword: false,
          passwordChangedAt: now,
          sessionVersion: { increment: 1 },
          localCredential: {
            update: {
              passwordHash: password.hash,
              passwordAlgorithm: password.algorithm,
              passwordUpdatedAt: now,
            },
          },
          auditEvents: { create: { type: V2AuthAuditEventType.PASSWORD_CHANGED } },
        },
      });

      return ok(toAuthUser(updated));
    });
  }
}
