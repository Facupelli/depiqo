import { Module } from '@nestjs/common';

import { TenantManagementModule } from '../tenant-management/tenant-management.module';
import { AssetCreationValidatorService } from './application/services/asset-creation-validator.service';
import { AddAssetsToEquipmentTypeHttpController } from './features/add-assets-to-equipment-type/add-assets-to-equipment-type.controller';
import { AddAssetsToEquipmentTypeHandler } from './features/add-assets-to-equipment-type/add-assets-to-equipment-type.handler';
import { CreateEquipmentTypeAccessoryDefaultsHttpController } from './features/create-equipment-type-accessory-defaults/create-equipment-type-accessory-defaults.controller';
import { CreateEquipmentTypeAccessoryDefaultsHandler } from './features/create-equipment-type-accessory-defaults/create-equipment-type-accessory-defaults.handler';
import { CreateEquipmentTypeHttpController } from './features/create-equipment-type/create-equipment-type.controller';
import { CreateEquipmentTypeHandler } from './features/create-equipment-type/create-equipment-type.handler';
import { CreateEquipmentTypeSetupService } from './features/create-equipment-type-setup/create-equipment-type-setup.service';
import { CreateOwnerWithContractHttpController } from './features/create-owner-with-contract/create-owner-with-contract.controller';
import { CreateOwnerWithContractHandler } from './features/create-owner-with-contract/create-owner-with-contract.handler';
import { GetAssetSummariesHttpController } from './features/get-asset-summaries/get-asset-summaries.controller';
import { GetAssetSummariesHandler } from './features/get-asset-summaries/get-asset-summaries.handler';
import { GetEquipmentTypeDetailHttpController } from './features/get-equipment-type-detail/get-equipment-type-detail.controller';
import { GetEquipmentTypeDetailHandler } from './features/get-equipment-type-detail/get-equipment-type-detail.handler';
import { GetEquipmentTypeSummariesHttpController } from './features/get-equipment-type-summaries/get-equipment-type-summaries.controller';
import { GetEquipmentTypeSummariesHandler } from './features/get-equipment-type-summaries/get-equipment-type-summaries.handler';
import { GetEquipmentTypesHttpController } from './features/get-equipment-types/get-equipment-types.controller';
import { GetEquipmentTypesHandler } from './features/get-equipment-types/get-equipment-types.handler';
import { GetRentalAccessoryDefaultsHttpController } from './features/get-rental-accessory-defaults/get-rental-accessory-defaults.controller';
import { GetRentalAccessoryDefaultsHandler } from './features/get-rental-accessory-defaults/get-rental-accessory-defaults.handler';
import { GetOwnerDetailHttpController } from './features/get-owner-detail/get-owner-detail.controller';
import { GetOwnerDetailHandler } from './features/get-owner-detail/get-owner-detail.handler';
import { GetOwnersHttpController } from './features/get-owners/get-owners.controller';
import { GetOwnersHandler } from './features/get-owners/get-owners.handler';
import { AssetRepository } from './persistence/asset.repository';
import { EquipmentTypeRepository } from './persistence/equipment-type.repository';
import { AssetInventoryPublicApiService } from './public-api/asset-inventory.public-api.service';
import { AssetInventoryPublicApi } from './public-api/asset-inventory.public-api';

@Module({
  imports: [TenantManagementModule],
  controllers: [
    AddAssetsToEquipmentTypeHttpController,
    CreateEquipmentTypeAccessoryDefaultsHttpController,
    CreateEquipmentTypeHttpController,
    CreateOwnerWithContractHttpController,
    GetAssetSummariesHttpController,
    GetEquipmentTypeDetailHttpController,
    GetEquipmentTypeSummariesHttpController,
    GetEquipmentTypesHttpController,
    GetOwnerDetailHttpController,
    GetOwnersHttpController,
    GetRentalAccessoryDefaultsHttpController,
  ],
  providers: [
    AddAssetsToEquipmentTypeHandler,
    CreateEquipmentTypeAccessoryDefaultsHandler,
    CreateEquipmentTypeHandler,
    CreateOwnerWithContractHandler,
    GetAssetSummariesHandler,
    GetEquipmentTypeDetailHandler,
    GetEquipmentTypeSummariesHandler,
    GetEquipmentTypesHandler,
    GetOwnerDetailHandler,
    GetOwnersHandler,
    GetRentalAccessoryDefaultsHandler,
    CreateEquipmentTypeSetupService,
    AssetCreationValidatorService,
    AssetRepository,
    EquipmentTypeRepository,
    { provide: AssetInventoryPublicApi, useClass: AssetInventoryPublicApiService },
  ],
  exports: [AssetInventoryPublicApi],
})
export class AssetInventoryModule {}
