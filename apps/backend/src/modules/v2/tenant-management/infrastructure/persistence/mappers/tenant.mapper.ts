import { Prisma } from 'src/generated/prisma/client';

import { Tenant } from '../../../domain/entities/tenant.aggregate';
import { TenantConfig, TenantConfigProps } from '../../../domain/value-objects/tenant-config.value-object';

type PrismaTenantWithBranding = Prisma.V2TenantGetPayload<{
  include: { branding: true };
}>;

export class TenantMapper {
  static toDomain(raw: PrismaTenantWithBranding): Tenant {
    return Tenant.reconstitute({
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      logoUrl: raw.branding?.logoUrl ?? null,
      faviconUrl: raw.branding?.faviconUrl ?? null,
      primaryColor: raw.branding?.primaryColor ?? null,
      accentColor: raw.branding?.accentColor ?? null,
      storefrontName: raw.branding?.storefrontName ?? null,
      tagline: raw.branding?.tagline ?? null,
      config: TenantConfig.reconstitute(raw.config as unknown as TenantConfigProps),
      activeBillingUnitId: null,
    });
  }

  static toConfigUpdateData(entity: Tenant): Prisma.V2TenantUpdateInput {
    return {
      config: entity.config.toPlainObject() as unknown as Prisma.InputJsonValue,
    };
  }

  static toBrandingPersistence(entity: Tenant): Prisma.V2TenantBrandingUncheckedCreateInput {
    return {
      tenantId: entity.id,
      logoUrl: entity.logoUrl,
      faviconUrl: entity.faviconUrl,
      primaryColor: entity.primaryColor,
      accentColor: entity.accentColor,
      storefrontName: entity.storefrontName,
      tagline: entity.tagline,
    };
  }

  static toBrandingUpdateData(entity: Tenant): Prisma.V2TenantBrandingUncheckedUpdateInput {
    return {
      logoUrl: entity.logoUrl,
      faviconUrl: entity.faviconUrl,
      primaryColor: entity.primaryColor,
      accentColor: entity.accentColor,
      storefrontName: entity.storefrontName,
      tagline: entity.tagline,
    };
  }
}
