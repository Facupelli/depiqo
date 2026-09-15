import { Module } from '@nestjs/common';

import { TenantAuthorization } from './tenant-authorization.public-api';
import { TenantAuthorizationService } from './tenant-authorization.service';

@Module({
  providers: [{ provide: TenantAuthorization, useClass: TenantAuthorizationService }],
  exports: [TenantAuthorization],
})
export class TenantAuthorizationModule {}
