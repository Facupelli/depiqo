import { BadRequestException, Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from 'src/config/env.schema';
import { Public } from 'src/core/decorators/public.decorator';
import { PrismaService } from 'src/core/database/prisma.service';
import { CurrentStorefrontTenant } from '../../../tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContext } from '../../../tenant-context/tenant-context.contract';
import { StorefrontTenantContextGuard } from '../../../tenant-context/guards/storefront-tenant-context.guard';
import { SkipCsrf } from '../../shared/csrf/skip-csrf.decorator';
import { GoogleAuthStateService } from '../../shared/google/google-auth-state.service';
import { CustomerGoogleStateRequestDto } from './customer-google-state.request.dto';

@Public()
@SkipCsrf()
@Controller('auth/customer/google')
export class CustomerGoogleStateController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleAuthStateService: GoogleAuthStateService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  @Post('state')
  @HttpCode(200)
  @UseGuards(StorefrontTenantContextGuard)
  async issueState(
    @Body() dto: CustomerGoogleStateRequestDto,
    @CurrentStorefrontTenant() storefrontTenant: StorefrontTenantContext,
  ): Promise<{ state: string }> {
    const tenantId = storefrontTenant.tenantId;

    const tenant = await this.prisma.client.v2Tenant.findFirst({
      where: {
        id: tenantId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        domains: {
          where: {
            status: 'VERIFIED',
            deletedAt: null,
          },
        },
      },
    });

    if (!tenant) {
      throw new BadRequestException(`No active tenant found for id: ${tenantId}`);
    }

    return {
      state: this.googleAuthStateService.issueState({
        tenantId,
        portalOrigin: this.resolveTrustedPortalOrigin(dto.portalOrigin, tenant),
        redirectPath: this.resolveTrustedRedirectPath(dto.redirectPath, dto.portalOrigin),
      }),
    };
  }

  private resolveTrustedPortalOrigin(
    portalOrigin: string,
    tenant: { slug: string; domains: Array<{ domain: string }> },
  ): string {
    const origin = this.parsePortalOrigin(portalOrigin);
    const hostname = origin.hostname.toLowerCase();
    const allowedHostnames = new Set([`${tenant.slug}.${this.configService.get('ROOT_DOMAIN')}`]);

    for (const domain of tenant.domains) {
      allowedHostnames.add(domain.domain.toLowerCase());
    }

    if (!allowedHostnames.has(hostname)) {
      throw new BadRequestException('Request hostname does not match the current tenant portal hostname.');
    }

    return origin.origin;
  }

  private resolveTrustedRedirectPath(redirectPath: string, portalOrigin: string): string {
    if (redirectPath.startsWith('/')) {
      if (redirectPath.startsWith('//')) {
        throw new BadRequestException('redirectPath must not be protocol-relative.');
      }

      return redirectPath;
    }

    let parsed: URL;

    try {
      parsed = new URL(redirectPath);
    } catch {
      throw new BadRequestException('redirectPath must be a relative path or a URL under portalOrigin.');
    }

    if (parsed.origin !== this.parsePortalOrigin(portalOrigin).origin) {
      throw new BadRequestException('redirectPath URL must match portalOrigin.');
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }

  private parsePortalOrigin(portalOrigin: string): URL {
    let parsed: URL;

    try {
      parsed = new URL(portalOrigin);
    } catch {
      throw new BadRequestException('portalOrigin must be a valid URL.');
    }

    if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) {
      throw new BadRequestException('portalOrigin must contain only scheme, hostname, and optional port.');
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new BadRequestException('portalOrigin must use http or https.');
    }

    if (parsed.protocol === 'http:' && parsed.hostname !== 'localhost' && !parsed.hostname.endsWith('.localhost')) {
      throw new BadRequestException('portalOrigin may use http only for localhost development hosts.');
    }

    return parsed;
  }
}
