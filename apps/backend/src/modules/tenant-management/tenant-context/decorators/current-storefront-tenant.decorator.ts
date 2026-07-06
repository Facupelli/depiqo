import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { StorefrontTenantContext } from '../tenant-context.contract';
import { StorefrontTenantRequest } from '../guards/storefront-tenant-context.guard';

export const CurrentStorefrontTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): StorefrontTenantContext => {
    const request = ctx.switchToHttp().getRequest<StorefrontTenantRequest>();

    return request.storefrontTenantContext;
  },
);
