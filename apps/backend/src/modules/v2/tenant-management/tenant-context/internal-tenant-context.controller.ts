import { Controller, Get, HttpCode, HttpStatus, NotFoundException, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { TenantContextResolverService } from './tenant-context-resolver.service';
import { TrustedTenantContext } from './tenant-context.contract';
import { normalizeHostname } from './utils/normalize-hostname.util';
import { InternalTokenGuard } from './guards/internal-token.guard';
import { SkipCsrf } from '../auth/shared/csrf/skip-csrf.decorator';
import { Public } from 'src/core/decorators/public.decorator';

const TENANT_CONTEXT_SUCCESS_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400';
const TENANT_CONTEXT_NOT_FOUND_CACHE_CONTROL = 'public, max-age=0, s-maxage=60';

@Public()
@SkipCsrf()
@Controller('v2/internal/tenant-context')
@UseGuards(InternalTokenGuard)
export class InternalTenantContextController {
  constructor(private readonly tenantContextResolver: TenantContextResolverService) {}

  @Get('resolve')
  @HttpCode(HttpStatus.OK)
  async resolve(
    @Query('hostname') rawHostname: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<TrustedTenantContext> {
    const hostname = normalizeHostname(rawHostname);

    try {
      const tenantContext = await this.tenantContextResolver.resolveByHostname(hostname);
      response.setHeader('Cache-Control', TENANT_CONTEXT_SUCCESS_CACHE_CONTROL);

      return tenantContext;
    } catch (error) {
      if (error instanceof NotFoundException) {
        response.setHeader('Cache-Control', TENANT_CONTEXT_NOT_FOUND_CACHE_CONTROL);
      }

      throw error;
    }
  }
}
