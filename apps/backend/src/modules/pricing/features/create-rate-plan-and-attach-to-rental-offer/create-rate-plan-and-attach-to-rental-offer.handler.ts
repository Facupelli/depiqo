import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  AttachRatePlanToRentalOfferOperation,
  AttachRatePlanToRentalOfferOperationError,
} from '../../application/operations/attach-rate-plan-to-rental-offer.operation';
import { CreateRatePlanOperation } from '../../application/operations/create-rate-plan.operation';
import {
  CreateRatePlanAndAttachToRentalOfferApplicationError,
  createRatePlanAndAttachToRentalOfferApplicationError,
} from './create-rate-plan-and-attach-to-rental-offer-application.error';
import { CreateRatePlanAndAttachToRentalOfferCommand } from './create-rate-plan-and-attach-to-rental-offer.command';

export interface CreateRatePlanAndAttachToRentalOfferResult {
  ratePlanId: string;
  rentalOfferPricingId: string;
}

type CreateRatePlanAndAttachToRentalOfferHandlerResult = Result<
  CreateRatePlanAndAttachToRentalOfferResult,
  CreateRatePlanAndAttachToRentalOfferApplicationError
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
      return err(
        createRatePlanAndAttachToRentalOfferApplicationError(
          createRatePlanResult.error.code,
          createRatePlanResult.error.message,
          'cause' in createRatePlanResult.error ? createRatePlanResult.error.cause : undefined,
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
      return err(this.mapAttachRatePlanError(attachRatePlanResult.error));
    }

    return ok({
      ratePlanId,
      rentalOfferPricingId: attachRatePlanResult.value.rentalOfferPricingId,
    });
  }

  private mapAttachRatePlanError(
    error: AttachRatePlanToRentalOfferOperationError,
  ): CreateRatePlanAndAttachToRentalOfferApplicationError {
    if (error.code === 'RentalOfferNotFound') {
      return createRatePlanAndAttachToRentalOfferApplicationError(error.code, error.message);
    }

    return createRatePlanAndAttachToRentalOfferApplicationError(
      'Unexpected',
      'Unable to attach the new rate plan.',
      error,
    );
  }
}
