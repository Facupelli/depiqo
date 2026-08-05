import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { AttachRatePlanToRentalOfferOperation } from '../../application/operations/attach-rate-plan-to-rental-offer.operation';
import { CreateRatePlanOperation } from '../../application/operations/create-rate-plan.operation';
import { CreateRatePlanAndAttachToRentalOfferCommand } from './create-rate-plan-and-attach-to-rental-offer.command';
import {
  CreateRatePlanAndAttachToRentalOfferError,
  createRatePlanAndAttachToRentalOfferError,
} from './create-rate-plan-and-attach-to-rental-offer.errors';

export interface CreateRatePlanAndAttachToRentalOfferResult {
  ratePlanId: string;
  rentalOfferPricingId: string;
}

type CreateRatePlanAndAttachToRentalOfferHandlerResult = Result<
  CreateRatePlanAndAttachToRentalOfferResult,
  CreateRatePlanAndAttachToRentalOfferError
>;

@CommandHandler(CreateRatePlanAndAttachToRentalOfferCommand)
export class CreateRatePlanAndAttachToRentalOfferHandler implements ICommandHandler<
  CreateRatePlanAndAttachToRentalOfferCommand,
  CreateRatePlanAndAttachToRentalOfferHandlerResult
> {
  constructor(
    private readonly createRatePlanOperation: CreateRatePlanOperation,
    private readonly attachRatePlanOperation: AttachRatePlanToRentalOfferOperation,
  ) {}

  async execute(
    command: CreateRatePlanAndAttachToRentalOfferCommand,
  ): Promise<CreateRatePlanAndAttachToRentalOfferHandlerResult> {
    const createRatePlanResult = await this.createRatePlanOperation.createRatePlan({ ...command, isActive: true });

    if (createRatePlanResult.isErr()) {
      const errorCodeByOperationCode = {
        RatePlanNameAlreadyInUse: 'pricing.rate_plan_name_already_in_use',
        InvalidRatePlan: 'pricing.invalid_rate_plan',
      } as const;

      return err(
        createRatePlanAndAttachToRentalOfferError(
          errorCodeByOperationCode[createRatePlanResult.error.code],
          createRatePlanResult.error.message,
          createRatePlanResult.error,
          {
            useCase: 'CreateRatePlanAndAttachToRentalOffer',
            tenantId: command.tenantId,
            catalogRentalOfferId: command.catalogRentalOfferId,
          },
        ),
      );
    }

    const ratePlanId = createRatePlanResult.value.ratePlan.id;
    const attachRatePlanResult = await this.attachRatePlanOperation.attachRatePlanToRentalOffer({
      tenantId: command.tenantId,
      catalogRentalOfferId: command.catalogRentalOfferId,
      ratePlanId,
    });

    if (attachRatePlanResult.isErr()) {
      if (attachRatePlanResult.error.code !== 'RentalOfferNotFound') {
        throw new Error('The newly created rate plan could not be attached.', { cause: attachRatePlanResult.error });
      }

      return err(
        createRatePlanAndAttachToRentalOfferError(
          'pricing.rental_offer_not_found',
          attachRatePlanResult.error.message,
          attachRatePlanResult.error,
          {
            useCase: 'CreateRatePlanAndAttachToRentalOffer',
            tenantId: command.tenantId,
            catalogRentalOfferId: command.catalogRentalOfferId,
            ratePlanId,
          },
        ),
      );
    }

    return ok({
      ratePlanId,
      rentalOfferPricingId: attachRatePlanResult.value.rentalOfferPricingId,
    });
  }
}
