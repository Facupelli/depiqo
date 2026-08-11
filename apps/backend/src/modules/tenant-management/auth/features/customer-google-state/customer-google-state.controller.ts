import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';

import { Public } from 'src/core/decorators/public.decorator';
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
  constructor(private readonly googleAuthStateService: GoogleAuthStateService) {}

  @Post('state')
  @HttpCode(200)
  @UseGuards(StorefrontTenantContextGuard)
  async issueState(
    @Body() dto: CustomerGoogleStateRequestDto,
    @CurrentStorefrontTenant() storefrontTenant: StorefrontTenantContext,
  ): Promise<{ state: string }> {
    return {
      state: await this.googleAuthStateService.issueState({
        tenantId: storefrontTenant.tenantId,
        canonicalHost: storefrontTenant.canonicalHost,
        redirectPath: dto.redirectPath,
      }),
    };
  }
}
