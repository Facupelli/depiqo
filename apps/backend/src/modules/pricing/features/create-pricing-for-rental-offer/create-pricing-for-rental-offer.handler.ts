import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { CreatePricingForRentalOfferOperation } from '../../application/operations/create-pricing-for-rental-offer.operation';
import { CreatePricingForRentalOfferCommand } from './create-pricing-for-rental-offer.command';
import {
  CreatePricingForRentalOfferError,
  createPricingForRentalOfferError,
} from './create-pricing-for-rental-offer.errors';

export interface CreatePricingForRentalOfferResult {
  catalogRentalOfferId: string;
  ratePlanId: string;
  rentalOfferPricingId: string;
}

@CommandHandler(CreatePricingForRentalOfferCommand)
export class CreatePricingForRentalOfferHandler implements ICommandHandler<
  CreatePricingForRentalOfferCommand,
  Result<CreatePricingForRentalOfferResult, CreatePricingForRentalOfferError>
> {
  constructor(private readonly createPricingOperation: CreatePricingForRentalOfferOperation) {}

  async execute(
    command: CreatePricingForRentalOfferCommand,
  ): Promise<Result<CreatePricingForRentalOfferResult, CreatePricingForRentalOfferError>> {
    const result = await this.createPricingOperation.createPricingForRentalOffer(command);

    if (result.isErr()) {
      const errorCodeByOperationCode = {
        RentalOfferNotFound: 'pricing.rental_offer_not_found',
        RatePlanNameAlreadyInUse: 'pricing.rate_plan_name_already_in_use',
        InvalidRatePlan: 'pricing.invalid_rate_plan',
      } as const;

      return err(
        createPricingForRentalOfferError(
          errorCodeByOperationCode[result.error.code],
          result.error.message,
          result.error,
          {
            useCase: 'CreatePricingForRentalOffer',
            tenantId: command.tenantId,
            catalogRentalOfferId: command.catalogRentalOfferId,
          },
        ),
      );
    }

    return ok({
      catalogRentalOfferId: result.value.catalogRentalOfferId,
      ratePlanId: result.value.ratePlanId,
      rentalOfferPricingId: result.value.rentalOfferPricingId,
    });
  }
}
