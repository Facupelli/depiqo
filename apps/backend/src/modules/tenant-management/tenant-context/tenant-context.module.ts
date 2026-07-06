import { Module } from '@nestjs/common';
import { InternalTenantContextController } from './internal-tenant-context.controller';
import { TenantContextResolverService } from './tenant-context-resolver.service';
import { InternalTokenGuard } from './guards/internal-token.guard';

@Module({
  controllers: [InternalTenantContextController],
  providers: [TenantContextResolverService, InternalTokenGuard],
})
export class TenantContextModule {}
