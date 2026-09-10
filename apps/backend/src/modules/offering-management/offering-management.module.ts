import { Module } from '@nestjs/common';

import { AssetInventoryModule } from '../asset-inventory/asset-inventory.module';
import { CatalogModule } from '../catalog/catalog.module';
import { PricingModule } from '../pricing/pricing.module';
import { TenantManagementModule } from '../tenant-management/tenant-management.module';
import { CreatePackageHttpController } from './features/create-package/create-package.controller';
import { CreatePackageHandler } from './features/create-package/create-package.handler';
import { CreateRentalOfferWithPricingHttpController } from './features/create-rental-offer-with-pricing/create-rental-offer-with-pricing.controller';
import { CreateRentalOfferWithPricingHandler } from './features/create-rental-offer-with-pricing/create-rental-offer-with-pricing.handler';
import { CreateEquipmentHttpController } from './features/create-equipment/create-equipment.controller';
import { CreateEquipmentHandler } from './features/create-equipment/create-equipment.handler';
import { GetEquipmentTypeRentalUsagesHttpController } from './features/get-equipment-type-rental-usages/get-equipment-type-rental-usages.controller';
import { GetEquipmentTypeRentalUsagesHandler } from './features/get-equipment-type-rental-usages/get-equipment-type-rental-usages.handler';
import { ListEquipmentTypesHttpController } from './features/list-equipment-types/list-equipment-types.controller';
import { ListEquipmentTypesHandler } from './features/list-equipment-types/list-equipment-types.handler';

@Module({
  imports: [TenantManagementModule, AssetInventoryModule, CatalogModule, PricingModule],
  controllers: [
    CreateEquipmentHttpController,
    CreatePackageHttpController,
    CreateRentalOfferWithPricingHttpController,
    ListEquipmentTypesHttpController,
    GetEquipmentTypeRentalUsagesHttpController,
  ],
  providers: [
    CreateEquipmentHandler,
    CreatePackageHandler,
    CreateRentalOfferWithPricingHandler,
    ListEquipmentTypesHandler,
    GetEquipmentTypeRentalUsagesHandler,
  ],
})
export class OfferingManagementModule {}
