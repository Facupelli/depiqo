import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Public } from 'src/core/decorators/public.decorator';
import { AuthCustomer } from '../../shared/auth.types';
import { CsrfService } from '../../shared/csrf/csrf.service';
import { SkipCsrf } from '../../shared/csrf/skip-csrf.decorator';
import { SessionRegeneratorService } from '../../shared/session/session-regenerator.service';
import { StorefrontTenantContextGuard } from '../../../tenant-context/guards/storefront-tenant-context.guard';
import { CustomerLocalAuthGuard } from './customer-local-auth.guard';
import { CustomerLoginRequestDto } from './customer-login.request.dto';

type CustomerLoginRequest = Request & {
  user: AuthCustomer;
};

@Public()
@SkipCsrf()
@Controller('auth/customer')
export class CustomerLoginController {
  constructor(
    private readonly sessionRegenerator: SessionRegeneratorService,
    private readonly csrfService: CsrfService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(StorefrontTenantContextGuard, CustomerLocalAuthGuard)
  async login(
    @Body() _dto: CustomerLoginRequestDto,
    @Req() req: CustomerLoginRequest,
  ): Promise<{ customer: AuthCustomer; csrfToken: string }> {
    const customer = req.user;

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
