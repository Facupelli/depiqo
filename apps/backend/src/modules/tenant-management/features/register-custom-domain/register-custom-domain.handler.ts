import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterCustomDomainResponseDto } from '@repo/api-contracts';
import { err, ok, Result } from 'neverthrow';
import { Env } from 'src/config/env.schema';
import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma, V2TenantDomainStatus } from 'src/generated/prisma/client';
import { normalizeAndValidateCustomDomain } from '../../domain/custom-domain';
import {
  InvalidCustomDomainError,
  UnsupportedApexCustomDomainError,
} from '../../domain/errors/tenant-management.errors';
import { CloudflareCustomHostnameService } from '../../infrastructure/cloudflare-custom-hostname.service';

import { toTenantDomainDto } from '../tenant-domain.presenter';
import { RegisterCustomDomainCommand } from './register-custom-domain.command';
import { RegisterCustomDomainError, registerCustomDomainError } from './register-custom-domain.errors';

export type RegisterCustomDomainResult = Result<RegisterCustomDomainResponseDto, RegisterCustomDomainError>;

@Injectable()
@CommandHandler(RegisterCustomDomainCommand)
export class RegisterCustomDomainHandler implements ICommandHandler<
  RegisterCustomDomainCommand,
  RegisterCustomDomainResult
> {
  private readonly rootDomain: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>,
    private readonly cloudflareCustomHostnameService: CloudflareCustomHostnameService,
  ) {
    this.rootDomain = this.configService.get('ROOT_DOMAIN');
  }

  async execute(command: RegisterCustomDomainCommand): Promise<RegisterCustomDomainResult> {
    const context = {
      useCase: 'RegisterCustomDomain',
      tenantId: command.tenantId,
    };
    const normalizedDomainResult = normalizeAndValidateCustomDomain(command.domain, this.rootDomain);

    if (normalizedDomainResult.isErr()) {
      const error = normalizedDomainResult.error;

      if (error instanceof UnsupportedApexCustomDomainError) {
        return err(
          registerCustomDomainError('tenant_management.unsupported_apex_custom_domain', error.message, error, context),
        );
      }

      if (error instanceof InvalidCustomDomainError) {
        return err(registerCustomDomainError('tenant_management.invalid_custom_domain', error.message, error, context));
      }

      throw error;
    }

    const normalizedDomain = normalizedDomainResult.value;

    const [tenant, existingTenantDomain, existingDomainOwner] = await Promise.all([
      this.prisma.client.v2Tenant.findFirst({
        where: { id: command.tenantId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.client.v2TenantDomain.findFirst({
        where: { tenantId: command.tenantId, deletedAt: null },
        select: { domain: true },
      }),
      this.prisma.client.v2TenantDomain.findFirst({
        where: { domain: normalizedDomain, deletedAt: null },
        select: { tenantId: true },
      }),
    ]);

    if (!tenant) {
      return err(
        registerCustomDomainError(
          'tenant_management.tenant_not_found',
          `Tenant "${command.tenantId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    if (existingTenantDomain) {
      return err(
        registerCustomDomainError(
          'tenant_management.tenant_already_has_custom_domain',
          `Tenant "${command.tenantId}" already has a custom domain.`,
          undefined,
          context,
        ),
      );
    }

    if (existingDomainOwner && existingDomainOwner.tenantId !== command.tenantId) {
      return err(
        registerCustomDomainError(
          'tenant_management.custom_domain_already_in_use',
          `Custom domain "${normalizedDomain}" is already in use.`,
          undefined,
          context,
        ),
      );
    }

    const providerHostname = await this.cloudflareCustomHostnameService.createCustomHostname(normalizedDomain);

    try {
      const created = await this.prisma.client.v2TenantDomain.create({
        data: {
          tenantId: command.tenantId,
          domain: normalizedDomain,
          status: V2TenantDomainStatus.PENDING,
          isPrimary: true,
          cfHostnameId: providerHostname.id,
        },
        select: {
          id: true,
          tenantId: true,
          domain: true,
          status: true,
          isPrimary: true,
          cfHostnameId: true,
          verifiedAt: true,
          lastCheckedAt: true,
          failureReason: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return ok({
        domain: toTenantDomainDto(created),
        cnameTarget: `customers.${this.rootDomain}`,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target) ? error.meta.target : [];

        if (target.includes('domain')) {
          return err(
            registerCustomDomainError(
              'tenant_management.custom_domain_already_in_use',
              `Custom domain "${normalizedDomain}" is already in use.`,
              error,
              context,
            ),
          );
        }
      }

      throw error;
    }
  }
}
