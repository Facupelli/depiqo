import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPublicTenantConfigResponseDto } from '@repo/api-contracts';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { TenantConfig, TenantConfigProps } from '../../domain/value-objects/tenant-config.value-object';
import { GetPublicTenantConfigError, getPublicTenantConfigError } from './get-public-tenant-config.errors';
import { GetPublicTenantConfigQuery } from './get-public-tenant-config.query';

export type GetPublicTenantConfigResult = Result<GetPublicTenantConfigResponseDto, GetPublicTenantConfigError>;

@QueryHandler(GetPublicTenantConfigQuery)
export class GetPublicTenantConfigHandler implements IQueryHandler<
  GetPublicTenantConfigQuery,
  GetPublicTenantConfigResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetPublicTenantConfigQuery): Promise<GetPublicTenantConfigResult> {
    const context = { useCase: 'GetPublicTenantConfig', tenantId: query.tenantId };
    const tenant = await this.prisma.client.v2Tenant.findFirst({
      where: {
        id: query.tenantId,
        deletedAt: null,
      },
      select: {
        config: true,
      },
    });

    if (!tenant) {
      return err(
        getPublicTenantConfigError(
          'tenant_management.tenant_not_found',
          `Tenant "${query.tenantId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    const config: TenantConfig = TenantConfig.reconstitute(tenant.config as unknown as TenantConfigProps);

    return ok({
      insuranceEnabled: config.pricing.insuranceEnabled,
      bookingMode: config.bookingMode,
      communicationMode: config.communication.orderCommunicationMode,
      currency: config.pricing.currency,
      locale: config.pricing.locale,
      whatsAppNumber: config.communication.whatsAppNumber,
      showFloatingWhatsAppButton: config.communication.showFloatingWhatsAppButton,
    });
  }
}
