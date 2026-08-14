import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { Public } from 'src/core/decorators/public.decorator';
import { AuthCustomer } from '../../shared/auth.types';
import { CurrentStorefrontTenant } from '../../../tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContext } from '../../../tenant-context/tenant-context.contract';
import { StorefrontTenantContextGuard } from '../../../tenant-context/guards/storefront-tenant-context.guard';
import { CsrfService } from '../../shared/csrf/csrf.service';
import { SkipCsrf } from '../../shared/csrf/skip-csrf.decorator';
import { CustomerGoogleHandoffTicketService } from '../../shared/handoff/customer-google-handoff-ticket.service';
import { SessionRegeneratorService } from '../../shared/session/session-regenerator.service';
import { CustomerGoogleFinalizeRequestDto } from './customer-google-finalize.request.dto';

@Public()
@SkipCsrf()
@Controller('auth/customer/google')
export class CustomerGoogleFinalizeController {
  constructor(
    private readonly handoffTicketService: CustomerGoogleHandoffTicketService,
    private readonly sessionRegenerator: SessionRegeneratorService,
    private readonly csrfService: CsrfService,
  ) {}

  @Post('finalize')
  @HttpCode(200)
  @UseGuards(StorefrontTenantContextGuard)
  async finalize(
    @Body() dto: CustomerGoogleFinalizeRequestDto,
    @Req() req: Request,
    @CurrentStorefrontTenant() storefrontTenant: StorefrontTenantContext,
  ): Promise<{ customer: AuthCustomer; csrfToken: string; redirectPath: string }> {
    const handoff = await this.handoffTicketService.consumeCustomerTicket({
      ticket: dto.ticket,
      tenantId: storefrontTenant.tenantId,
      canonicalHost: storefrontTenant.canonicalHost,
      returnHost: storefrontTenant.returnHost,
    });

    await this.sessionRegenerator.regenerate(req);
    await this.loginWithPassport(req, handoff.customer);

    const csrfToken = this.csrfService.rotateToken(req);

    return {
      customer: handoff.customer,
      csrfToken,
      redirectPath: handoff.redirectPath,
    };
  }

  private loginWithPassport(req: Request, customer: AuthCustomer): Promise<void> {
    return new Promise((resolve, reject) => {
      req.login(customer, (error) => {
        if (error) {
          return reject(error);
        }

        resolve();
      });
    });
  }
}
