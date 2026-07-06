import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RefreshCustomDomainStatusResponseDto } from '@repo/api-contracts';
import { err, ok, Result } from 'neverthrow';
import { PrismaService } from 'src/core/database/prisma.service';
import { V2TenantDomainStatus } from 'src/generated/prisma/client';
import {
  CloudflareCustomHostname,
  CloudflareCustomHostnameService,
} from '../../infrastructure/cloudflare-custom-hostname.service';

import { customDomainApplicationError, CustomDomainApplicationError } from '../custom-domain-application.error';
import { toTenantDomainDto } from '../tenant-domain.presenter';
import { RefreshCustomDomainStatusCommand } from './refresh-custom-domain-status.command';

export type RefreshCustomDomainStatusResult = Result<
  RefreshCustomDomainStatusResponseDto,
  CustomDomainApplicationError
>;

interface ProviderState {
  status: V2TenantDomainStatus;
  failureReason: string | null;
}

@Injectable()
@CommandHandler(RefreshCustomDomainStatusCommand)
export class RefreshCustomDomainStatusHandler implements ICommandHandler<
  RefreshCustomDomainStatusCommand,
  RefreshCustomDomainStatusResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudflareCustomHostnameService: CloudflareCustomHostnameService,
  ) {}

  async execute(command: RefreshCustomDomainStatusCommand): Promise<RefreshCustomDomainStatusResult> {
    const customDomain = await this.prisma.client.v2TenantDomain.findFirst({
      where: { tenantId: command.tenantId, deletedAt: null },
      select: {
        id: true,
        domain: true,
        cfHostnameId: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    if (!customDomain) {
      return err(
        customDomainApplicationError(
          'CustomDomainNotFound',
          `No custom domain was found for tenant "${command.tenantId}".`,
        ),
      );
    }

    if (!customDomain.cfHostnameId) {
      throw new Error(`Custom domain '${customDomain.domain}' is missing a Cloudflare hostname id`);
    }

    const providerHostname = await this.cloudflareCustomHostnameService.getCustomHostname(customDomain.cfHostnameId);
    const providerState = this.mapProviderState(providerHostname);
    const checkedAt = new Date();

    const updated = await this.prisma.client.v2TenantDomain.update({
      where: { id: customDomain.id },
      data: {
        status: providerState.status,
        verifiedAt: providerState.status === V2TenantDomainStatus.VERIFIED ? checkedAt : null,
        lastCheckedAt: checkedAt,
        failureReason: providerState.failureReason,
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

    return ok(toTenantDomainDto(updated));
  }

  private mapProviderState(providerHostname: CloudflareCustomHostname): ProviderState {
    const errors = [...providerHostname.validationErrors, ...providerHostname.ownershipVerificationErrors];
    const combinedError = errors.length > 0 ? errors.join('; ') : null;
    const providerStatus = providerHostname.status?.toLowerCase() ?? null;
    const sslStatus = providerHostname.sslStatus?.toLowerCase() ?? null;

    if (sslStatus === 'active') {
      return {
        status: V2TenantDomainStatus.VERIFIED,
        failureReason: null,
      };
    }

    if (
      providerStatus === 'deleted' ||
      providerStatus === 'blocked' ||
      providerStatus === 'moved' ||
      sslStatus === 'deleted' ||
      sslStatus === 'deactivated' ||
      sslStatus === 'validation_timed_out'
    ) {
      return {
        status: V2TenantDomainStatus.DISABLED,
        failureReason: combinedError || 'Cloudflare reported the custom hostname as unavailable',
      };
    }

    return {
      status: V2TenantDomainStatus.PENDING,
      failureReason: combinedError,
    };
  }
}
