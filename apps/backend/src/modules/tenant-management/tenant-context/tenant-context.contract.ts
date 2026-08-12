export type {
  PublicStorefrontTenantContext,
  PublicTenantContext,
  StorefrontTenantTokenPayload,
  TrustedTenantContext,
} from '@repo/api-contracts';

export type StorefrontTenantContext = {
  tenantId: string;
  host: string;
  canonicalHost: string;
  returnHost?: string;
  scope: 'public-storefront';
};
