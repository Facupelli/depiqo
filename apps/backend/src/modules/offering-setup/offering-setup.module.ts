import { Module } from '@nestjs/common';

import { AssetInventoryModule } from '../asset-inventory/asset-inventory.module';
import { CatalogModule } from '../catalog/catalog.module';
import { PricingModule } from '../pricing/pricing.module';
import { TenantManagementModule } from '../tenant-management/tenant-management.module';
import { CreatePackageHttpController } from './features/create-package/create-package.controller';
import { CreatePackageHandler } from './features/create-package/create-package.handler';
import { CreateRentalOfferWithPricingHttpController } from './features/create-rental-offer-with-pricing/create-rental-offer-with-pricing.controller';
import { CreateRentalOfferWithPricingHandler } from './features/create-rental-offer-with-pricing/create-rental-offer-with-pricing.handler';
import { CreateRentableEquipmentHttpController } from './features/create-rentable-equipment/create-rentable-equipment.controller';
import { CreateRentableEquipmentHandler } from './features/create-rentable-equipment/create-rentable-equipment.handler';

@Module({
  imports: [TenantManagementModule, AssetInventoryModule, CatalogModule, PricingModule],
  controllers: [
    CreateRentableEquipmentHttpController,
    CreatePackageHttpController,
    CreateRentalOfferWithPricingHttpController,
  ],
  providers: [CreateRentableEquipmentHandler, CreatePackageHandler, CreateRentalOfferWithPricingHandler],
})
export class OfferingSetupModule {}
