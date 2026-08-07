import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module';
import { ContractsModule } from '../contracts/contracts.module';
import { PricingModule } from '../pricing/pricing.module';
import { TenantManagementModule } from '../tenant-management/tenant-management.module';
import { RentalAssetAllocationService } from './asset-allocation/rental-asset-allocation.service';
import { AssignRentalAccessoriesHttpController } from './features/assign-rental-accessories/assign-rental-accessories.controller';
import { AssignRentalAccessoriesHandler } from './features/assign-rental-accessories/assign-rental-accessories.handler';
import { AssignCustomerToDraftRentalHttpController } from './features/assign-customer-to-draft-rental/assign-customer-to-draft-rental.controller';
import { AssignCustomerToDraftRentalHandler } from './features/assign-customer-to-draft-rental/assign-customer-to-draft-rental.handler';
import { CancelRentalHttpController } from './features/cancel-rental/cancel-rental.controller';
import { CancelRentalHandler } from './features/cancel-rental/cancel-rental.handler';
import { ConfirmRentalHttpController } from './features/confirm-rental/confirm-rental.controller';
import { ConfirmRentalHandler } from './features/confirm-rental/confirm-rental.handler';
import { CreateConfirmedRentalHttpController } from './features/create-confirmed-rental/create-confirmed-rental.controller';
import { CreateConfirmedRentalService } from './features/create-confirmed-rental/create-confirmed-rental.handler';
import { CreateDraftRentalHttpController } from './features/create-draft-rental/create-draft-rental.controller';
import { CreateDraftRentalService } from './features/create-draft-rental/create-draft-rental.service';
import { EditConfirmedRentalHttpController } from './features/edit-confirmed-rental/edit-confirmed-rental.controller';
import { EditConfirmedRentalHandler } from './features/edit-confirmed-rental/edit-confirmed-rental.handler';
import { EditUnconfirmedRentalHttpController } from './features/edit-unconfirmed-rental/edit-unconfirmed-rental.controller';
import { EditUnconfirmedRentalHandler } from './features/edit-unconfirmed-rental/edit-unconfirmed-rental.handler';
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
import { PrismaRentalRepository } from './persistence/prisma-rental.repository';
import { RentalRepository } from './persistence/rental.repository';
import { UpsertRentalAssetCandidateWhenAssetCreatedEventHandler } from './projections/upsert-rental-asset-candidate-when-asset-created.event-handler';
import { UpdateCandidatesWhenEquipmentTypeLifecycleChangedEventHandler } from './projections/update-candidates-when-equipment-type-lifecycle-changed.event-handler';
import { RentalOwnerSplitCalculator } from './owner-split/rental-owner-split-calculator';
import { RentalCommitmentPublicApiService } from './public-api/rental-commitment.public-api.service';
import { RentalCommitmentPublicApi } from './public-api/rental-commitment.public-api';

@Module({
  imports: [CatalogModule, ContractsModule, PricingModule, TenantManagementModule],
  controllers: [
    AssignRentalAccessoriesHttpController,
    AssignCustomerToDraftRentalHttpController,
    CancelRentalHttpController,
    ConfirmRentalHttpController,
    CreateConfirmedRentalHttpController,
    CreateDraftRentalHttpController,
    EditConfirmedRentalHttpController,
    EditUnconfirmedRentalHttpController,
    GetRentalsCalendarHttpController,
    GetRentalDetailHttpController,
    GetRentalsHttpController,
    GetRentalOfferAvailabilityHttpController,
    GetStorefrontBranchesHttpController,
    GetStorefrontRentalOfferAvailabilityHttpController,
  ],
  providers: [
    { provide: RentalRepository, useClass: PrismaRentalRepository },
    RentalAssetAllocationService,
    AssignRentalAccessoriesHandler,
    AssignCustomerToDraftRentalHandler,
    CancelRentalHandler,
    ConfirmRentalHandler,
    CreateConfirmedRentalService,
    CreateDraftRentalService,
    EditConfirmedRentalHandler,
    EditUnconfirmedRentalHandler,
    GetRentalDetailHandler,
    GetRentalsCalendarHandler,
    GetRentalsHandler,
    GetRentalOfferAvailabilityHandler,
    GetStorefrontBranchesHandler,
    GetStorefrontRentalOfferAvailabilityHandler,
    UpsertRentalAssetCandidateWhenAssetCreatedEventHandler,
    UpdateCandidatesWhenEquipmentTypeLifecycleChangedEventHandler,
    RentalOwnerSplitCalculator,
    { provide: RentalCommitmentPublicApi, useClass: RentalCommitmentPublicApiService },
  ],
  exports: [RentalCommitmentPublicApi],
})
export class RentalCommitmentModule {}
