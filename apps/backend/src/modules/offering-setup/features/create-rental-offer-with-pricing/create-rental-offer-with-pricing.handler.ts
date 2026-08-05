import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { CatalogPublicApi, CatalogPublicApiError } from '../../../catalog/public-api/catalog.public-api';
import { PricingPublicApi, PricingPublicApiError } from '../../../pricing/public-api/pricing.public-api';
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
    private readonly catalog: CatalogPublicApi,
    private readonly pricing: PricingPublicApi,
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

    const pricingResult =
      command.pricing.mode === 'CREATE_RATE_PLAN'
        ? await this.pricing.createRatePlanAndAttachToRentalOffer({
            tenantId: command.tenantId,
            catalogRentalOfferId: rentalOffer.value.rentalOfferId,
            ...command.pricing.ratePlan,
          })
        : await this.pricing.attachRatePlanToRentalOffer({
            tenantId: command.tenantId,
            catalogRentalOfferId: rentalOffer.value.rentalOfferId,
            ratePlanId: command.pricing.ratePlanId,
          });
    if (pricingResult.isErr()) return err(mapPricingError(pricingResult.error));

    return ok({ rentalOfferId: rentalOffer.value.rentalOfferId, ...pricingResult.value });
  }
}

function mapTenantError(error: ValidateOfferingSetupError): CreateRentalOfferWithPricingError {
  const code =
    error.code === 'TenantUnavailable' ? 'offering_setup.tenant_unavailable' : 'offering_setup.branch_unavailable';
  return createRentalOfferWithPricingError(code, error.message, error, error.context);
}

function mapCatalogError(error: CatalogPublicApiError): CreateRentalOfferWithPricingError {
  const codes = {
    InvalidField: 'offering_setup.invalid_rental_offer',
    RentableItemNotFound: 'offering_setup.rentable_item_not_found',
    RentableItemArchived: 'offering_setup.rentable_item_archived',
    RentalOfferAlreadyExists: 'offering_setup.rental_offer_already_exists',
  } as const;
  const code = codes[error.code as keyof typeof codes];
  if (!code) throw error;
  return createRentalOfferWithPricingError(code, error.message, error, error.context);
}

function mapPricingError(error: PricingPublicApiError): CreateRentalOfferWithPricingError {
  const codes = {
    RatePlanNotFound: 'offering_setup.rate_plan_not_found',
    RatePlanInactive: 'offering_setup.rate_plan_inactive',
    RatePlanNameAlreadyInUse: 'offering_setup.rate_plan_name_already_in_use',
    InvalidRatePlan: 'offering_setup.invalid_rate_plan',
  } as const;
  const code = codes[error.code as keyof typeof codes];
  if (!code) throw error;
  return createRentalOfferWithPricingError(code, error.message, error);
}
