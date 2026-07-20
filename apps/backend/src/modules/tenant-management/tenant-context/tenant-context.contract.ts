export type {
  PublicStorefrontTenantContext,
  PublicTenantContext,
  StorefrontTenantTokenPayload,
  TrustedTenantContext,
} from '@repo/api-contracts';

export type StorefrontTenantContext = {
  tenantId: string;
  host: string;
  scope: 'public-storefront';
};
