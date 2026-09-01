import { Module } from '@nestjs/common';

import { AssetInventoryModule } from '../asset-inventory/asset-inventory.module';
import { CatalogModule } from '../catalog/catalog.module';
import { PricingModule } from '../pricing/pricing.module';
import { TenantManagementModule } from '../tenant-management/tenant-management.module';
import { RentalOfferAvailabilityService } from './application/availability/rental-offer-availability.service';
import { RentalAssetAllocationService } from './asset-allocation/rental-asset-allocation.service';
import { AddRentalSelectionHttpController } from './features/add-rental-selection/add-rental-selection.controller';
import { AddRentalSelectionHandler } from './features/add-rental-selection/add-rental-selection.handler';
import { AssignRentalAccessoriesHttpController } from './features/assign-rental-accessories/assign-rental-accessories.controller';
import { AssignRentalAccessoriesHandler } from './features/assign-rental-accessories/assign-rental-accessories.handler';
import { RentalOperationalFactsValidatorService } from './application/rental-operational-facts-validator.service';
import { AssignCustomerToDraftRentalHttpController } from './features/assign-customer-to-draft-rental/assign-customer-to-draft-rental.controller';
import { AssignCustomerToDraftRentalHandler } from './features/assign-customer-to-draft-rental/assign-customer-to-draft-rental.handler';
import { CancelRentalHttpController } from './features/cancel-rental/cancel-rental.controller';
import { CancelRentalHandler } from './features/cancel-rental/cancel-rental.handler';
import { ChangeRentalDetailsHttpController } from './features/change-rental-details/change-rental-details.controller';
import { ChangeRentalDetailsHandler } from './features/change-rental-details/change-rental-details.handler';
import { ChangeRentalSelectionQuantityHttpController } from './features/change-rental-selection-quantity/change-rental-selection-quantity.controller';
import { ChangeRentalSelectionQuantityHandler } from './features/change-rental-selection-quantity/change-rental-selection-quantity.handler';
import { ConfirmRentalHttpController } from './features/confirm-rental/confirm-rental.controller';
import { ConfirmRentalHandler } from './features/confirm-rental/confirm-rental.handler';
import { CreateConfirmedRentalHttpController } from './features/create-confirmed-rental/create-confirmed-rental.controller';
import { CreateConfirmedRentalService } from './features/create-confirmed-rental/create-confirmed-rental.handler';
import { CreateDraftRentalHttpController } from './features/create-draft-rental/create-draft-rental.controller';
import { CreateDraftRentalService } from './features/create-draft-rental/create-draft-rental.service';
import { EditUnconfirmedRentalHttpController } from './features/edit-unconfirmed-rental/edit-unconfirmed-rental.controller';
import { EditUnconfirmedRentalHandler } from './features/edit-unconfirmed-rental/edit-unconfirmed-rental.handler';
import { GetRentalAccessoryDefaultsHttpController } from './features/get-rental-accessory-defaults/get-rental-accessory-defaults.controller';
import { GetRentalAccessoryDefaultsHandler } from './features/get-rental-accessory-defaults/get-rental-accessory-defaults.handler';
import { GetReplacementAssetCandidatesHttpController } from './features/get-replacement-asset-candidates/get-replacement-asset-candidates.controller';
import { GetReplacementAssetCandidatesHandler } from './features/get-replacement-asset-candidates/get-replacement-asset-candidates.handler';
import { ReplaceConfirmedRentalAssetHttpController } from './features/replace-confirmed-rental-asset/replace-confirmed-rental-asset.controller';
import { ReplaceConfirmedRentalAssetHandler } from './features/replace-confirmed-rental-asset/replace-confirmed-rental-asset.handler';
import { RemoveRentalSelectionHttpController } from './features/remove-rental-selection/remove-rental-selection.controller';
import { RemoveRentalSelectionHandler } from './features/remove-rental-selection/remove-rental-selection.handler';
import { GetRentalDetailHttpController } from './features/get-rental-detail/get-rental-detail.controller';
import { GetRentalDetailHandler } from './features/get-rental-detail/get-rental-detail.handler';
import { GetRentalsCalendarHttpController } from './features/get-rentals-calendar/get-rentals-calendar.controller';
import { GetRentalsCalendarHandler } from './features/get-rentals-calendar/get-rentals-calendar.handler';
import { GetRentalsHttpController } from './features/get-rentals/get-rentals.controller';
import { GetRentalsHandler } from './features/get-rentals/get-rentals.handler';
import { GetRentalOfferAvailabilityHttpController } from './features/get-rental-offer-availability/get-rental-offer-availability.controller';
import { GetRentalOfferAvailabilityHandler } from './features/get-rental-offer-availability/get-rental-offer-availability.handler';
import { GetStorefrontBranchesHttpController } from './features/get-storefront-branches/get-storefront-branches.controller';
import { GetStorefrontBranchesHandler } from './features/get-storefront-branches/get-storefront-branches.handler';
import { GetStorefrontRentalOfferAvailabilityHttpController } from './features/get-storefront-rental-offer-availability/get-storefront-rental-offer-availability.controller';
import { GetStorefrontRentalOfferAvailabilityHandler } from './features/get-storefront-rental-offer-availability/get-storefront-rental-offer-availability.handler';
import { RentalNumberAllocator } from './persistence/rental-number.allocator';
import { PrismaRentalRepository } from './persistence/prisma-rental.repository';
import { RentalRepository } from './persistence/rental.repository';
import { UpsertRentalAssetCandidateWhenAssetCreatedEventHandler } from './projections/upsert-rental-asset-candidate-when-asset-created.event-handler';
import { UpdateRentalAssetCandidateWhenAssetOwnershipChangedEventHandler } from './projections/update-rental-asset-candidate-when-asset-ownership-changed.event-handler';
import { UpdateRentalAssetCandidateWhenAssetRetiredEventHandler } from './projections/update-rental-asset-candidate-when-asset-retired.event-handler';
import { RentalOwnerSplitCalculator } from './owner-split/rental-owner-split-calculator';
import { AcceptedRentalPricingFacts } from './public-api/accepted-rental-pricing-facts.public-api';
import { AcceptedRentalPricingFactsService } from './public-api/accepted-rental-pricing-facts.service';
import { CommittedRentalSelectionsAndDemand } from './public-api/committed-rental-selections-and-demand.public-api';
import { CommittedRentalSelectionsAndDemandService } from './public-api/committed-rental-selections-and-demand.service';
import { RentalPhysicalAssignments } from './public-api/rental-physical-assignments.public-api';
import { RentalPhysicalAssignmentsService } from './public-api/rental-physical-assignments.service';
import { RentalLifecycleFacts } from './public-api/rental-lifecycle-facts.public-api';
import { RentalLifecycleFactsService } from './public-api/rental-lifecycle-facts.service';

@Module({
  imports: [AssetInventoryModule, CatalogModule, PricingModule, TenantManagementModule],
  controllers: [
    AddRentalSelectionHttpController,
    AssignRentalAccessoriesHttpController,
    AssignCustomerToDraftRentalHttpController,
    CancelRentalHttpController,
    ChangeRentalDetailsHttpController,
    ChangeRentalSelectionQuantityHttpController,
    ConfirmRentalHttpController,
    CreateConfirmedRentalHttpController,
    CreateDraftRentalHttpController,
    EditUnconfirmedRentalHttpController,
    GetReplacementAssetCandidatesHttpController,
    ReplaceConfirmedRentalAssetHttpController,
    RemoveRentalSelectionHttpController,
    GetRentalsCalendarHttpController,
    GetRentalDetailHttpController,
    GetRentalAccessoryDefaultsHttpController,
    GetRentalsHttpController,
    GetRentalOfferAvailabilityHttpController,
    GetStorefrontBranchesHttpController,
    GetStorefrontRentalOfferAvailabilityHttpController,
  ],
  providers: [
    RentalOperationalFactsValidatorService,
    RentalNumberAllocator,
    { provide: RentalRepository, useClass: PrismaRentalRepository },
    RentalAssetAllocationService,
    RentalOfferAvailabilityService,
    AddRentalSelectionHandler,
    AssignRentalAccessoriesHandler,
    AssignCustomerToDraftRentalHandler,
    CancelRentalHandler,
    ChangeRentalDetailsHandler,
    ChangeRentalSelectionQuantityHandler,
    ConfirmRentalHandler,
    CreateConfirmedRentalService,
    CreateDraftRentalService,
    EditUnconfirmedRentalHandler,
    GetReplacementAssetCandidatesHandler,
    ReplaceConfirmedRentalAssetHandler,
    RemoveRentalSelectionHandler,
    GetRentalDetailHandler,
    GetRentalAccessoryDefaultsHandler,
    GetRentalsCalendarHandler,
    GetRentalsHandler,
    GetRentalOfferAvailabilityHandler,
    GetStorefrontBranchesHandler,
    GetStorefrontRentalOfferAvailabilityHandler,
    UpsertRentalAssetCandidateWhenAssetCreatedEventHandler,
    UpdateRentalAssetCandidateWhenAssetOwnershipChangedEventHandler,
    UpdateRentalAssetCandidateWhenAssetRetiredEventHandler,
    RentalOwnerSplitCalculator,
    { provide: AcceptedRentalPricingFacts, useClass: AcceptedRentalPricingFactsService },
    { provide: CommittedRentalSelectionsAndDemand, useClass: CommittedRentalSelectionsAndDemandService },
    { provide: RentalLifecycleFacts, useClass: RentalLifecycleFactsService },
    { provide: RentalPhysicalAssignments, useClass: RentalPhysicalAssignmentsService },
  ],
  exports: [
    AcceptedRentalPricingFacts,
    CommittedRentalSelectionsAndDemand,
    RentalLifecycleFacts,
    RentalPhysicalAssignments,
  ],
})
export class RentalCommitmentModule {}
