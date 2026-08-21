import { Module } from '@nestjs/common';

import { TenantManagementModule } from '../tenant-management/tenant-management.module';
import { AssetBranchReferenceValidatorService } from './application/services/asset-branch-reference-validator.service';
import { AssetCreationValidatorService } from './application/services/asset-creation-validator.service';
import { AddAssetsToEquipmentTypeHttpController } from './features/add-assets-to-equipment-type/add-assets-to-equipment-type.controller';
import { AddAssetsToEquipmentTypeHandler } from './features/add-assets-to-equipment-type/add-assets-to-equipment-type.handler';
import { ReplaceEquipmentTypeAccessoryDefaultsHttpController } from './features/replace-equipment-type-accessory-defaults/replace-equipment-type-accessory-defaults.controller';
import { ReplaceEquipmentTypeAccessoryDefaultsHandler } from './features/replace-equipment-type-accessory-defaults/replace-equipment-type-accessory-defaults.handler';
import { UpdateAssetHttpController } from './features/update-asset/update-asset.controller';
import { UpdateAssetHandler } from './features/update-asset/update-asset.handler';
import { UpdateEquipmentTypeHttpController } from './features/update-equipment-type/update-equipment-type.controller';
import { UpdateEquipmentTypeHandler } from './features/update-equipment-type/update-equipment-type.handler';
import { CreateEquipmentTypeAccessoryDefaultsHttpController } from './features/create-equipment-type-accessory-defaults/create-equipment-type-accessory-defaults.controller';
import { CreateEquipmentTypeAccessoryDefaultsHandler } from './features/create-equipment-type-accessory-defaults/create-equipment-type-accessory-defaults.handler';
import { CreateEquipmentTypeHttpController } from './features/create-equipment-type/create-equipment-type.controller';
import { CreateEquipmentTypeHandler } from './features/create-equipment-type/create-equipment-type.handler';
import { CreateEquipmentTypeSetupService } from './features/create-equipment-type-setup/create-equipment-type-setup.service';
import { CreateOwnerWithContractHttpController } from './features/create-owner-with-contract/create-owner-with-contract.controller';
import { CreateOwnerWithContractHandler } from './features/create-owner-with-contract/create-owner-with-contract.handler';
import { GetAssetSummariesHttpController } from './features/get-asset-summaries/get-asset-summaries.controller';
import { GetAssetSummariesHandler } from './features/get-asset-summaries/get-asset-summaries.handler';
import { GetAssetsHttpController } from './features/get-assets/get-assets.controller';
import { GetAssetsHandler } from './features/get-assets/get-assets.handler';
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
import { ActivePhysicalStockFactsService } from './public-api/active-physical-stock-facts.public-api.service';
import { ActivePhysicalStockFacts } from './public-api/active-physical-stock-facts.public-api';
import { AssetInventoryDisplayFactsService } from './public-api/asset-inventory-display-facts.public-api.service';
import { AssetInventoryDisplayFacts } from './public-api/asset-inventory-display-facts.public-api';
import { AssetInventoryAuthoringService } from './public-api/asset-inventory-authoring.public-api.service';
import { AssetInventoryAuthoring } from './public-api/asset-inventory-authoring.public-api';
import { EquipmentTypeReferenceAuthorityService } from './public-api/equipment-type-reference-authority.public-api.service';
import { EquipmentTypeReferenceAuthority } from './public-api/equipment-type-reference-authority.public-api';

@Module({
  imports: [TenantManagementModule],
  controllers: [
    AddAssetsToEquipmentTypeHttpController,
    ReplaceEquipmentTypeAccessoryDefaultsHttpController,
    UpdateAssetHttpController,
    UpdateEquipmentTypeHttpController,
    CreateEquipmentTypeAccessoryDefaultsHttpController,
    CreateEquipmentTypeHttpController,
    CreateOwnerWithContractHttpController,
    GetAssetSummariesHttpController,
    GetAssetsHttpController,
    GetEquipmentTypeDetailHttpController,
    GetEquipmentTypeSummariesHttpController,
    GetEquipmentTypesHttpController,
    GetOwnerDetailHttpController,
    GetOwnersHttpController,
    GetRentalAccessoryDefaultsHttpController,
  ],
  providers: [
    AddAssetsToEquipmentTypeHandler,
    ReplaceEquipmentTypeAccessoryDefaultsHandler,
    UpdateAssetHandler,
    UpdateEquipmentTypeHandler,
    CreateEquipmentTypeAccessoryDefaultsHandler,
    CreateEquipmentTypeHandler,
    CreateOwnerWithContractHandler,
    GetAssetSummariesHandler,
    GetAssetsHandler,
    GetEquipmentTypeDetailHandler,
    GetEquipmentTypeSummariesHandler,
    GetEquipmentTypesHandler,
    GetOwnerDetailHandler,
    GetOwnersHandler,
    GetRentalAccessoryDefaultsHandler,
    CreateEquipmentTypeSetupService,
    AssetBranchReferenceValidatorService,
    AssetCreationValidatorService,
    AssetRepository,
    EquipmentTypeRepository,
    { provide: ActivePhysicalStockFacts, useClass: ActivePhysicalStockFactsService },
    { provide: AssetInventoryAuthoring, useClass: AssetInventoryAuthoringService },
    { provide: EquipmentTypeReferenceAuthority, useClass: EquipmentTypeReferenceAuthorityService },
    { provide: AssetInventoryDisplayFacts, useClass: AssetInventoryDisplayFactsService },
  ],
  exports: [
    ActivePhysicalStockFacts,
    AssetInventoryAuthoring,
    EquipmentTypeReferenceAuthority,
    AssetInventoryDisplayFacts,
  ],
})
export class AssetInventoryModule {}
