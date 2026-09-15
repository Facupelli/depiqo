import { Module } from '@nestjs/common';

import { TenantAuthorizationHttpEnforcer } from './tenant-authorization-http.enforcer';
import { TenantAuthorization } from './tenant-authorization.public-api';
import { TenantAuthorizationService } from './tenant-authorization.service';

@Module({
  providers: [{ provide: TenantAuthorization, useClass: TenantAuthorizationService }, TenantAuthorizationHttpEnforcer],
  exports: [TenantAuthorization, TenantAuthorizationHttpEnforcer],
})
export class TenantAuthorizationModule {}
