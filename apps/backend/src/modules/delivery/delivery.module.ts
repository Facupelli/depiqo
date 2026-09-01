import { Module } from '@nestjs/common';

import { TenantManagementModule } from '../tenant-management/tenant-management.module';
import { BranchDeliveryConfigurationRepository } from './persistence/branch-delivery-configuration.repository';

@Module({
  imports: [TenantManagementModule],
  providers: [BranchDeliveryConfigurationRepository],
})
export class DeliveryModule {}
