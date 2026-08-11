import { Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { StorefrontTenantContextGuard } from '../../../tenant-context/guards/storefront-tenant-context.guard';
import { AuthCustomer } from '../../shared/auth.types';
import { CurrentUser } from '../../shared/current-user/current-user.decorator';
import { SESSION_COOKIE_NAME } from '../../shared/session/auth-session.constants';
import { SessionAuthGuard } from '../../shared/session/session-auth.guard';
import { SessionRegeneratorService } from '../../shared/session/session-regenerator.service';
import { StorefrontTenantCustomerSessionGuard } from '../../shared/session/storefront-tenant-customer-session.guard';

@Controller('auth/customer')
@UseGuards(StorefrontTenantContextGuard, SessionAuthGuard, StorefrontTenantCustomerSessionGuard)
export class CustomerSessionController {
  constructor(private readonly sessionRegenerator: SessionRegeneratorService) {}

  @Get('me')
  me(@CurrentUser() customer: AuthCustomer): AuthCustomer {
    return customer;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.logoutFromPassport(req);
    await this.sessionRegenerator.destroy(req);
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  }

  private logoutFromPassport(req: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      req.logout((error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  }
}
