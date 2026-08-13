import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  TenantBookingModeFact,
  TenantOperationalFact,
  TenantOperationalFacts,
  TenantOperationalFactsError,
} from './tenant-operational-facts.public-api';
import { TenantBookingMode, TenantConfig, TenantConfigProps } from '../domain/value-objects/tenant-config.value-object';

@Injectable()
export class TenantOperationalFactsService extends TenantOperationalFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getTenantOperationalFacts(input: { tenantId: string }): Promise<Result<TenantOperationalFact, TenantOperationalFactsError>> {
    const tenant = await this.prisma.client.v2Tenant.findUnique({
      where: { id: input.tenantId },
      select: { id: true, status: true, deletedAt: true, config: true },
    });

    if (!tenant) return err({ code: 'TenantNotFound', message: `Tenant "${input.tenantId}" was not found.` });
    if (tenant.deletedAt) return err({ code: 'TenantDeleted', message: `Tenant "${input.tenantId}" is deleted.` });
    if (tenant.status !== 'ACTIVE') return err({ code: 'TenantInactive', message: `Tenant "${input.tenantId}" is inactive.` });

    const config = this.reconstituteTenantConfig(tenant.config);
    if (!config) {
      return err({
        code: 'TenantConfigurationInvalid',
        message: `Tenant "${input.tenantId}" configuration is invalid.`,
      });
    }

    return ok({ tenantId: tenant.id, bookingMode: this.toBookingModeFact(config.bookingMode) });
  }

  private reconstituteTenantConfig(config: unknown): TenantConfig | null {
    try {
      return TenantConfig.reconstitute(config as TenantConfigProps);
    } catch {
      return null;
    }
  }

  private toBookingModeFact(bookingMode: TenantBookingMode): TenantBookingModeFact {
    return bookingMode === TenantBookingMode.INSTANT_BOOK ? 'INSTANT_BOOK' : 'REQUEST_TO_BOOK';
  }
}
