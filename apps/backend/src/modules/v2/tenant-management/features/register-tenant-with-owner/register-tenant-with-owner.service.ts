import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InputJsonValue } from '@prisma/client/runtime/client';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  V2AuthAuditEventType,
  V2AuthProvider,
  V2TenantStatus,
  V2UserRole,
  V2UserStatus,
} from 'src/generated/prisma/enums';

import { normalizeEmail } from '../../auth/shared/auth.types';
import { PasswordService } from '../../auth/shared/password/password.service';
import { Tenant } from '../../domain/entities/tenant.aggregate';
import { TenantManagementError, TenantSlugAlreadyInUseError } from '../../domain/errors/tenant-management.errors';
import { RegisterTenantWithOwnerCommand } from './register-tenant-with-owner.command';

export interface RegisterTenantWithOwnerResponse {
  tenantId: string;
  tenantUserId: string;
}

@CommandHandler(RegisterTenantWithOwnerCommand)
export class RegisterTenantWithOwnerService implements ICommandHandler<
  RegisterTenantWithOwnerCommand,
  Result<RegisterTenantWithOwnerResponse, TenantManagementError>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(
    command: RegisterTenantWithOwnerCommand,
  ): Promise<Result<RegisterTenantWithOwnerResponse, TenantManagementError>> {
    const slug = this.createSlug(command.tenantName);
    const tenantResult = Tenant.create({ name: command.tenantName, slug });

    if (tenantResult.isErr()) {
      return err(tenantResult.error);
    }

    const tenant = tenantResult.value;
    const existingTenant = await this.prisma.client.v2Tenant.findUnique({
      where: { slug: tenant.slug },
      select: { id: true },
    });

    if (existingTenant) {
      return err(new TenantSlugAlreadyInUseError(tenant.slug));
    }

    const email = normalizeEmail(command.ownerEmail);
    const password = await this.passwordService.hashPassword(command.ownerPassword);

    const created = await this.prisma.client.$transaction(async (tx) => {
      const createdTenant = await tx.v2Tenant.create({
        data: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          status: V2TenantStatus.ACTIVE,
          config: tenant.config.toPlainObject() as unknown as InputJsonValue,
        },
        select: { id: true },
      });

      const tenantUser = await tx.v2TenantUser.create({
        data: {
          tenantId: createdTenant.id,
          email,
          name: command.ownerName.trim(),
          role: V2UserRole.ADMIN,
          status: V2UserStatus.ACTIVE,
          identities: {
            create: {
              provider: V2AuthProvider.LOCAL,
              providerAccountId: `${createdTenant.id}:${email}`,
              email,
              emailVerified: false,
            },
          },
          localCredential: {
            create: {
              passwordHash: password.hash,
              passwordAlgorithm: password.algorithm,
            },
          },
        },
        select: { id: true },
      });

      await tx.v2AuthAuditEvent.create({
        data: {
          userId: tenantUser.id,
          type: V2AuthAuditEventType.ACCOUNT_CREATED,
          metadata: {
            tenantId: createdTenant.id,
            provider: V2AuthProvider.LOCAL,
            registration: true,
          },
        },
      });

      return {
        tenantId: createdTenant.id,
        tenantUserId: tenantUser.id,
      };
    });

    return ok(created);
  }

  private createSlug(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
