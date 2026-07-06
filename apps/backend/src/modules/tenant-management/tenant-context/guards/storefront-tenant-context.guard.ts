import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';
import { Request } from 'express';
import { Env } from 'src/config/env.schema';
import { StorefrontTenantContext } from '../tenant-context.contract';

const STOREFRONT_TENANT_CONTEXT_HEADER_NAME = 'x-storefront-tenant-context';

type StorefrontTenantJwtPayload = {
  scope?: unknown;
  tenant_id?: unknown;
  host?: unknown;
};

export type StorefrontTenantRequest = Request & {
  storefrontTenantContext: StorefrontTenantContext;
};

@Injectable()
export class StorefrontTenantContextGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const token = request.header(STOREFRONT_TENANT_CONTEXT_HEADER_NAME);

    if (!token) {
      throw new UnauthorizedException('Missing storefront tenant context');
    }

    const payload = await this.verifyToken(token);

    if (payload.scope !== 'public-storefront') {
      throw new UnauthorizedException('Invalid storefront tenant scope');
    }

    if (typeof payload.tenant_id !== 'string' || !payload.tenant_id) {
      throw new UnauthorizedException('Invalid storefront tenant id');
    }

    if (typeof payload.host !== 'string' || !payload.host) {
      throw new UnauthorizedException('Invalid storefront tenant host');
    }

    const storefrontRequest = request as StorefrontTenantRequest;

    storefrontRequest.storefrontTenantContext = {
      tenantId: payload.tenant_id,
      host: payload.host,
      scope: 'public-storefront',
    };

    return true;
  }

  private async verifyToken(token: string): Promise<StorefrontTenantJwtPayload> {
    const secret = this.configService.get('STOREFRONT_TENANT_JWT_SECRET');
    const issuer = this.configService.get('STOREFRONT_TENANT_JWT_ISSUER');
    const audience = this.configService.get('STOREFRONT_TENANT_JWT_AUDIENCE');

    const encodedSecret = new TextEncoder().encode(secret);

    try {
      const result = await jwtVerify(token, encodedSecret, {
        issuer,
        audience,
      });

      return result.payload as StorefrontTenantJwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid storefront tenant context');
    }
  }
}
