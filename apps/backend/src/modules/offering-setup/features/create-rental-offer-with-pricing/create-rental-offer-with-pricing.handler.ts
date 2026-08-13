import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  CatalogOfferingAuthoring,
  CatalogOfferingAuthoringError,
} from '../../../catalog/public-api/catalog-offering-authoring.public-api';
import {
  PricingRatePlanAuthoring,
  PricingRatePlanAuthoringError,
} from '../../../pricing/public-api/pricing-rate-plan-authoring.public-api';
import {
  PricingRentalOfferPricingAssignment,
  PricingRentalOfferPricingAssignmentError,
} from '../../../pricing/public-api/pricing-rental-offer-pricing-assignment.public-api';
import {
  TenantManagementPublicApi,
  ValidateOfferingSetupError,
} from '../../../tenant-management/public-api/tenant-management.public-api';
import { CreateRentalOfferWithPricingCommand } from './create-rental-offer-with-pricing.command';
import {
  CreateRentalOfferWithPricingError,
  createRentalOfferWithPricingError,
} from './create-rental-offer-with-pricing.errors';

export type CreateRentalOfferWithPricingServiceResult = Result<
  { rentalOfferId: string; ratePlanId: string; rentalOfferPricingId: string },
  CreateRentalOfferWithPricingError
>;

@CommandHandler(CreateRentalOfferWithPricingCommand)
export class CreateRentalOfferWithPricingHandler implements ICommandHandler<
  CreateRentalOfferWithPricingCommand,
  CreateRentalOfferWithPricingServiceResult
> {
  constructor(
    private readonly tenantManagement: TenantManagementPublicApi,
    private readonly catalog: CatalogOfferingAuthoring,
    private readonly ratePlanAuthoring: PricingRatePlanAuthoring,
    private readonly rentalOfferPricingAssignment: PricingRentalOfferPricingAssignment,
  ) {}

  async execute(command: CreateRentalOfferWithPricingCommand): Promise<CreateRentalOfferWithPricingServiceResult> {
    const tenantValidation = await this.tenantManagement.validateOfferingSetup({
      tenantId: command.tenantId,
      branchIds: [command.branchId],
    });
    if (tenantValidation.isErr()) return err(mapTenantError(tenantValidation.error));

    const rentalOffer = await this.catalog.createRentalOfferForRentableItem({
      tenantId: command.tenantId,
      rentableItemId: command.rentableItemId,
      branchId: command.branchId,
    });
    if (rentalOffer.isErr()) return err(mapCatalogError(rentalOffer.error));

    if (command.pricing.mode === 'CREATE_RATE_PLAN') {
      const ratePlan = await this.ratePlanAuthoring.createRatePlan({
        tenantId: command.tenantId,
        ...command.pricing.ratePlan,
        isActive: true,
      });
      if (ratePlan.isErr()) return err(mapRatePlanAuthoringError(ratePlan.error));

      const assignment = await this.rentalOfferPricingAssignment.assignRatePlanToRentalOffer({
        tenantId: command.tenantId,
        catalogRentalOfferId: rentalOffer.value.rentalOfferId,
        ratePlanId: ratePlan.value.ratePlanId,
      });
      if (assignment.isErr()) return err(mapRentalOfferPricingAssignmentError(assignment.error));

      return ok({ rentalOfferId: rentalOffer.value.rentalOfferId, ...assignment.value });
    }

    const assignment = await this.rentalOfferPricingAssignment.assignRatePlanToRentalOffer({
      tenantId: command.tenantId,
      catalogRentalOfferId: rentalOffer.value.rentalOfferId,
      ratePlanId: command.pricing.ratePlanId,
    });
    if (assignment.isErr()) return err(mapRentalOfferPricingAssignmentError(assignment.error));

    return ok({ rentalOfferId: rentalOffer.value.rentalOfferId, ...assignment.value });
  }
}

function mapTenantError(error: ValidateOfferingSetupError): CreateRentalOfferWithPricingError {
  const code =
    error.code === 'TenantUnavailable' ? 'offering_setup.tenant_unavailable' : 'offering_setup.branch_unavailable';
  return createRentalOfferWithPricingError(code, error.message, error, error.context);
}

function mapCatalogError(error: CatalogOfferingAuthoringError): CreateRentalOfferWithPricingError {
  const codes = {
    InvalidField: 'offering_setup.invalid_rental_offer',
    RentableItemNotFound: 'offering_setup.rentable_item_not_found',
    RentableItemArchived: 'offering_setup.rentable_item_archived',
    RentalOfferAlreadyExists: 'offering_setup.rental_offer_already_exists',
    BranchNotFound: 'offering_setup.branch_unavailable',
    BranchInactive: 'offering_setup.branch_unavailable',
    BranchDeleted: 'offering_setup.branch_unavailable',
    BranchContextUnavailable: 'offering_setup.branch_unavailable',
  } as const;
  const code = codes[error.code as keyof typeof codes];
  if (!code) throw error;
  return createRentalOfferWithPricingError(code, error.message, error);
}

function mapRatePlanAuthoringError(error: PricingRatePlanAuthoringError): CreateRentalOfferWithPricingError {
  const codes = {
    RatePlanNameAlreadyInUse: 'offering_setup.rate_plan_name_already_in_use',
    InvalidRatePlan: 'offering_setup.invalid_rate_plan',
  } as const;
  return createRentalOfferWithPricingError(codes[error.code], error.message, error);
}

function mapRentalOfferPricingAssignmentError(
  error: PricingRentalOfferPricingAssignmentError,
): CreateRentalOfferWithPricingError {
  const codes = {
    RatePlanNotFound: 'offering_setup.rate_plan_not_found',
    RatePlanInactive: 'offering_setup.rate_plan_inactive',
  } as const;
  const code = codes[error.code as keyof typeof codes];
  if (!code) throw error;
  return createRentalOfferWithPricingError(code, error.message, error);
}
