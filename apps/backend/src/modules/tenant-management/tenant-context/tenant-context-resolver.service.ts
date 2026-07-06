import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from 'src/config/env.schema';
import { PublicStorefrontTenantContext, TrustedTenantContext } from './tenant-context.contract';
import { BANNED_TENANT_SLUGS } from '../domain/tenant.constants';
import { PrismaService } from 'src/core/database/prisma.service';

type ResolvedStorefrontTenant = {
  tenantId: string;
  slug: string;
  publicTenant: PublicStorefrontTenantContext;
};

@Injectable()
export class TenantContextResolverService {
  private readonly rootDomain: string;
  private readonly adminHostname: string;
  private readonly platformHostnames: Set<string>;

  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    const rootDomain = this.configService.get('ROOT_DOMAIN');

    this.rootDomain = rootDomain;
    this.adminHostname = `app.${rootDomain}`;
    this.platformHostnames = new Set([rootDomain, `www.${rootDomain}`, `auth.${rootDomain}`, 'localhost']);
  }

  async resolveByHostname(hostname: string): Promise<TrustedTenantContext> {
    if (this.platformHostnames.has(hostname)) {
      return {
        face: 'platform',
        host: hostname,
      };
    }

    if (hostname === this.adminHostname) {
      return {
        face: 'admin',
        host: hostname,
      };
    }

    if (hostname.endsWith(`.${this.rootDomain}`)) {
      const slug = hostname.slice(0, -`.${this.rootDomain}`.length);

      return this.resolveBySlug(hostname, slug);
    }

    return this.resolveByCustomDomain(hostname);
  }

  private async resolveBySlug(hostname: string, slug: string): Promise<TrustedTenantContext> {
    if (BANNED_TENANT_SLUGS.includes(slug)) {
      throw new NotFoundException(`No tenant found for slug: ${slug}`);
    }

    const tenant = await this.getTenantBySlug(slug);

    if (!tenant) {
      throw new NotFoundException(`No tenant found for slug: ${slug}`);
    }

    return this.toTrustedStorefrontContext(hostname, tenant);
  }

  private async resolveByCustomDomain(hostname: string): Promise<TrustedTenantContext> {
    const tenant = await this.getTenantByCustomDomain(hostname);

    if (!tenant) {
      throw new NotFoundException(`No tenant found for custom domain: ${hostname}`);
    }

    return this.toTrustedStorefrontContext(hostname, tenant);
  }

  private async getTenantBySlug(slug: string): Promise<ResolvedStorefrontTenant | null> {
    const tenant = await this.prisma.client.v2Tenant.findFirst({
      where: {
        slug,
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        config: true,
        domains: {
          where: {
            isPrimary: true,
            status: 'VERIFIED',
            verifiedAt: {
              not: null,
            },
            deletedAt: null,
          },
          select: {
            domain: true,
          },
          take: 1,
        },
      },
    });

    if (!tenant) {
      return null;
    }

    return this.toResolvedStorefrontTenant(tenant);
  }

  private async getTenantByCustomDomain(domain: string): Promise<ResolvedStorefrontTenant | null> {
    const tenantDomain = await this.prisma.client.v2TenantDomain.findFirst({
      where: {
        domain,
        status: 'VERIFIED',
        verifiedAt: {
          not: null,
        },
        deletedAt: null,
        tenant: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
      select: {
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            config: true,
            domains: {
              where: {
                isPrimary: true,
                status: 'VERIFIED',
                verifiedAt: {
                  not: null,
                },
                deletedAt: null,
              },
              select: {
                domain: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!tenantDomain) {
      return null;
    }

    return this.toResolvedStorefrontTenant(tenantDomain.tenant);
  }

  private toTrustedStorefrontContext(hostname: string, tenant: ResolvedStorefrontTenant): TrustedTenantContext {
    return {
      face: 'storefront',
      host: hostname,
      tenantId: tenant.tenantId,
      slug: tenant.slug,
      scope: 'public-storefront',
      publicTenant: tenant.publicTenant,
    };
  }

  private toResolvedStorefrontTenant(tenant: {
    id: string;
    slug: string;
    name: string;
    config: unknown;
    domains: Array<{ domain: string }>;
  }): ResolvedStorefrontTenant {
    const config = parseTenantPublicConfig(tenant.config);

    return {
      tenantId: tenant.id,
      slug: tenant.slug,
      publicTenant: {
        slug: tenant.slug,
        name: tenant.name,
        customDomain: tenant.domains[0]?.domain ?? null,
        logoUrl: config.logoUrl,
        faviconUrl: config.faviconUrl,
        primaryColor: config.primaryColor,
      },
    };
  }
}

function parseTenantPublicConfig(config: unknown): {
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
} {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return {
      logoUrl: null,
      faviconUrl: null,
      primaryColor: null,
    };
  }

  const value = config as Record<string, unknown>;

  return {
    logoUrl: typeof value.logoUrl === 'string' ? value.logoUrl : null,
    faviconUrl: typeof value.faviconUrl === 'string' ? value.faviconUrl : null,
    primaryColor: typeof value.primaryColor === 'string' ? value.primaryColor : null,
  };
}
