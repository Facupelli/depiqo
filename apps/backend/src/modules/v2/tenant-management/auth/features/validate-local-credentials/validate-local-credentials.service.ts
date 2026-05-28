import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2AuthAuditEventType, V2UserStatus } from 'src/generated/prisma/enums';
import { AuthAuditService } from '../../shared/audit/auth-audit.service';
import { AuthRequestMetadata, AuthUser, normalizeEmail, toAuthUser } from '../../shared/auth.types';
import { PasswordService } from '../../shared/password/password.service';

@Injectable()
export class ValidateLocalCredentialsService {
  private readonly invalidCredentialsError = new UnauthorizedException('Invalid email or password.');

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly authAuditService: AuthAuditService,
  ) {}

  async validateLocalCredentials(input: {
    email: string;
    password: string;
    metadata?: AuthRequestMetadata;
  }): Promise<AuthUser> {
    const email = normalizeEmail(input.email);

    const user = await this.prisma.client.v2TenantUser.findFirst({
      where: { email },
      include: {
        localCredential: true,
      },
    });

    if (!user) {
      await this.recordLoginFailure({
        reason: 'USER_NOT_FOUND',
        metadata: input.metadata,
      });

      throw this.invalidCredentialsError;
    }

    if (!user.localCredential) {
      await this.recordLoginFailure({
        userId: user.id,
        reason: 'NO_LOCAL_CREDENTIAL',
        metadata: input.metadata,
      });

      throw this.invalidCredentialsError;
    }

    const isPasswordValid = await this.passwordService.verifyPassword({
      password: input.password,
      hash: user.localCredential.passwordHash,
      algorithm: user.localCredential.passwordAlgorithm,
    });

    if (!isPasswordValid) {
      await this.recordLoginFailure({
        userId: user.id,
        reason: 'INVALID_PASSWORD',
        metadata: input.metadata,
      });

      throw this.invalidCredentialsError;
    }

    if (user.status !== V2UserStatus.ACTIVE) {
      await this.recordLoginFailure({
        userId: user.id,
        reason: 'USER_NOT_ACTIVE',
        metadata: input.metadata,
      });

      throw this.invalidCredentialsError;
    }

    const updatedUser = await this.prisma.client.v2TenantUser.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    await this.authAuditService.record({
      userId: user.id,
      type: V2AuthAuditEventType.LOGIN_SUCCESS,
      ip: input.metadata?.ip,
      userAgent: input.metadata?.userAgent,
      metadata: {
        provider: 'LOCAL',
      },
    });

    return toAuthUser(updatedUser);
  }

  private async recordLoginFailure(input: {
    userId?: string | null;
    reason: string;
    metadata?: AuthRequestMetadata;
  }): Promise<void> {
    await this.authAuditService.record({
      userId: input.userId ?? null,
      type: V2AuthAuditEventType.LOGIN_FAILURE,
      ip: input.metadata?.ip,
      userAgent: input.metadata?.userAgent,
      metadata: {
        reason: input.reason,
        provider: 'LOCAL',
      },
    });
  }
}
