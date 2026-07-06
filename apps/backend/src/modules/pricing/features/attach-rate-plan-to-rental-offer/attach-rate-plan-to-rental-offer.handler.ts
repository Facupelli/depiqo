import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { AttachRatePlanToRentalOfferOperation } from '../../application/operations/attach-rate-plan-to-rental-offer.operation';
import {
  AttachRatePlanToRentalOfferApplicationError,
  attachRatePlanToRentalOfferApplicationError,
} from './attach-rate-plan-to-rental-offer-application.error';
import { AttachRatePlanToRentalOfferCommand } from './attach-rate-plan-to-rental-offer.command';

export interface AttachRatePlanToRentalOfferResult {
  rentalOfferPricingId: string;
}

@CommandHandler(AttachRatePlanToRentalOfferCommand)
export class AttachRatePlanToRentalOfferHandler implements ICommandHandler<
  AttachRatePlanToRentalOfferCommand,
  Result<AttachRatePlanToRentalOfferResult, AttachRatePlanToRentalOfferApplicationError>
> {
  constructor(private readonly attachRatePlanOperation: AttachRatePlanToRentalOfferOperation) {}

  async execute(
    command: AttachRatePlanToRentalOfferCommand,
  ): Promise<Result<AttachRatePlanToRentalOfferResult, AttachRatePlanToRentalOfferApplicationError>> {
    const result = await this.attachRatePlanOperation.attachRatePlanToRentalOffer(command);

    if (result.isErr()) {
      return err(attachRatePlanToRentalOfferApplicationError(result.error.code, result.error.message));
    }

    return ok(result.value);
  }
}
