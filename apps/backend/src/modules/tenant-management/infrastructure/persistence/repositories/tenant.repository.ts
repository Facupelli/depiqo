import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import { Tenant } from '../../../domain/entities/tenant.aggregate';
import { TenantMapper } from '../mappers/tenant.mapper';

@Injectable()
export class TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string): Promise<Tenant | null> {
    const tenant = await this.prisma.client.v2Tenant.findFirst({
      where: {
        id: tenantId,
        deletedAt: null,
      },
      include: { branding: true },
    });

    return tenant ? TenantMapper.toDomain(tenant) : null;
  }

  async saveConfig(tenant: Tenant): Promise<void> {
    await this.prisma.client.v2Tenant.update({
      where: { id: tenant.id },
      data: TenantMapper.toConfigUpdateData(tenant),
    });
  }

  async saveBranding(tenant: Tenant): Promise<string> {
    const branding = await this.prisma.client.v2TenantBranding.upsert({
      where: { tenantId: tenant.id },
      create: TenantMapper.toBrandingPersistence(tenant),
      update: TenantMapper.toBrandingUpdateData(tenant),
      select: { id: true },
    });

    return branding.id;
  }
}
