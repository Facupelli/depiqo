import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';

import { Public } from 'src/core/decorators/public.decorator';
import { AuthCustomer } from '../../shared/auth.types';
import { CsrfService } from '../../shared/csrf/csrf.service';
import { SkipCsrf } from '../../shared/csrf/skip-csrf.decorator';
import { CustomerGoogleHandoffTicketService } from '../../shared/handoff/customer-google-handoff-ticket.service';
import { SessionRegeneratorService } from '../../shared/session/session-regenerator.service';
import { CustomerGoogleFinalizeRequestDto } from './customer-google-finalize.request.dto';

@Public()
@SkipCsrf()
@Controller('v2/auth/customer/google')
export class CustomerGoogleFinalizeController {
  constructor(
    private readonly handoffTicketService: CustomerGoogleHandoffTicketService,
    private readonly sessionRegenerator: SessionRegeneratorService,
    private readonly csrfService: CsrfService,
  ) {}

  @Post('finalize')
  @HttpCode(200)
  async finalize(
    @Body() dto: CustomerGoogleFinalizeRequestDto,
    @Req() req: Request,
  ): Promise<{ customer: AuthCustomer; csrfToken: string }> {
    const customer = await this.handoffTicketService.consumeCustomerTicket(dto.ticket);

    await this.sessionRegenerator.regenerate(req);
    await this.loginWithPassport(req, customer);

    const csrfToken = this.csrfService.rotateToken(req);

    return {
      customer,
      csrfToken,
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
