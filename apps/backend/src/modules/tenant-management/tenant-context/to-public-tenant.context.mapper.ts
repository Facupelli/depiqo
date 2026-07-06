import { PublicTenantContext, TrustedTenantContext } from './tenant-context.contract';

export function toPublicTenantContext(context: TrustedTenantContext): PublicTenantContext {
  if (context.face === 'platform') {
    return { face: 'platform' };
  }

  if (context.face === 'admin') {
    return { face: 'admin' };
  }

  return {
    face: 'storefront',
    tenant: context.publicTenant,
  };
}
