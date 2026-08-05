import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { AttachRatePlanToRentalOfferOperation } from '../../application/operations/attach-rate-plan-to-rental-offer.operation';
import {
  AttachRatePlanToRentalOfferError,
  attachRatePlanToRentalOfferError,
} from './attach-rate-plan-to-rental-offer.errors';
import { AttachRatePlanToRentalOfferCommand } from './attach-rate-plan-to-rental-offer.command';

export interface AttachRatePlanToRentalOfferResult {
  rentalOfferPricingId: string;
}

@CommandHandler(AttachRatePlanToRentalOfferCommand)
export class AttachRatePlanToRentalOfferHandler implements ICommandHandler<
  AttachRatePlanToRentalOfferCommand,
  Result<AttachRatePlanToRentalOfferResult, AttachRatePlanToRentalOfferError>
> {
  constructor(private readonly attachRatePlanOperation: AttachRatePlanToRentalOfferOperation) {}

  async execute(
    command: AttachRatePlanToRentalOfferCommand,
  ): Promise<Result<AttachRatePlanToRentalOfferResult, AttachRatePlanToRentalOfferError>> {
    const result = await this.attachRatePlanOperation.attachRatePlanToRentalOffer(command);

    if (result.isErr()) {
      const errorCodeByOperationCode = {
        RentalOfferNotFound: 'pricing.rental_offer_not_found',
        RatePlanNotFound: 'pricing.rate_plan_not_found',
        RatePlanInactive: 'pricing.rate_plan_inactive',
      } as const;

      return err(
        attachRatePlanToRentalOfferError(
          errorCodeByOperationCode[result.error.code],
          result.error.message,
          result.error,
          {
            useCase: 'AttachRatePlanToRentalOffer',
            tenantId: command.tenantId,
            catalogRentalOfferId: command.catalogRentalOfferId,
            ratePlanId: command.ratePlanId,
          },
        ),
      );
    }

    return ok(result.value);
  }
}
