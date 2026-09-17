import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import type { Request } from 'express';
import { StorefrontTenantRequest } from '../../../tenant-context/guards/storefront-tenant-context.guard';
import { AuthCustomer } from '../../shared/auth.types';
import { ValidateCustomerLocalCredentialsService } from '../validate-customer-local-credentials/validate-customer-local-credentials.service';

@Injectable()
export class CustomerLocalStrategy extends PassportStrategy(Strategy, 'customer-local') {
  constructor(private readonly validateCustomerLocalCredentialsService: ValidateCustomerLocalCredentialsService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, email: string, password: string): Promise<AuthCustomer> {
    // SAFETY: Passport invokes this strategy with the Express request type configured by the local authentication guard.
    const storefrontRequest = req as StorefrontTenantRequest;

    return this.validateCustomerLocalCredentialsService.validateCustomerLocalCredentials({
      tenantId: storefrontRequest.storefrontTenantContext.tenantId,
      email,
      password,
      metadata: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });
  }
}
