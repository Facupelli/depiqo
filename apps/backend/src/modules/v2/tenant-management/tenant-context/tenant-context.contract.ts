export type TenantFace = 'platform' | 'admin' | 'storefront';

export type PublicStorefrontTenantContext = {
  slug: string;
  name: string;
  customDomain: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
};

export type PublicTenantContext =
  | {
      face: 'platform';
    }
  | {
      face: 'admin';
    }
  | {
      face: 'storefront';
      tenant: PublicStorefrontTenantContext;
    };

export type TrustedTenantContext =
  | {
      face: 'platform';
      host: string;
    }
  | {
      face: 'admin';
      host: string;
    }
  | {
      face: 'storefront';
      host: string;
      tenantId: string;
      slug: string;
      scope: 'public-storefront';
      publicTenant: PublicStorefrontTenantContext;
    };

export type StorefrontTenantTokenPayload = {
  iss: 'tanstack-start-bff';
  aud: 'nestjs-api';
  scope: 'public-storefront';
  tenant_id: string;
  host: string;
  iat: number;
  exp: number;
};

export type StorefrontTenantContext = {
  tenantId: string;
  host: string;
  scope: 'public-storefront';
};
