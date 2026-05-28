import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { CatalogPublicApi } from '../../../catalog/public-api/catalog.public-api';
import { PricingPublicApi } from '../../../pricing/public-api/pricing.public-api';
import { TenantManagementPublicApi } from '../../../tenant-management/public-api/tenant-management.public-api';
import { OfferingSetupApplicationError } from '../offering-setup-application.error';
import { CreateRentalOfferWithPricingCommand } from './create-rental-offer-with-pricing.command';
import {
  mapCatalogError,
  mapPricingError,
  mapTenantManagementError,
} from './map-create-rental-offer-with-pricing-error';

export type CreateRentalOfferWithPricingServiceResult = Result<
  {
    rentalOfferId: string;
    ratePlanId: string;
    rentalOfferPricingId: string;
  },
  OfferingSetupApplicationError
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

    if (tenantValidation.isErr()) {
      return err(mapTenantManagementError(tenantValidation.error));
    }

    const rentalOffer = await this.catalog.createRentalOfferForRentableItem({
      tenantId: command.tenantId,
      rentableItemId: command.rentableItemId,
      branchId: command.branchId,
    });

    if (rentalOffer.isErr()) {
      return err(mapCatalogError(rentalOffer.error));
    }

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

    if (pricingResult.isErr()) {
      return err(mapPricingError(pricingResult.error));
    }

    return ok({
      rentalOfferId: rentalOffer.value.rentalOfferId,
      ratePlanId: pricingResult.value.ratePlanId,
      rentalOfferPricingId: pricingResult.value.rentalOfferPricingId,
    });
  }
}
