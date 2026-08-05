import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { V2BillingUnit } from 'src/generated/prisma/client';
import { AttachRatePlanToRentalOfferCommand } from '../features/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer.command';
import { AttachRatePlanToRentalOfferError } from '../features/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer.errors';
import { AttachRatePlanToRentalOfferResult as AttachRatePlanToRentalOfferHandlerResult } from '../features/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer.handler';
import { CreateRatePlanAndAttachToRentalOfferCommand } from '../features/create-rate-plan-and-attach-to-rental-offer/create-rate-plan-and-attach-to-rental-offer.command';
import { CreateRatePlanAndAttachToRentalOfferError } from '../features/create-rate-plan-and-attach-to-rental-offer/create-rate-plan-and-attach-to-rental-offer.errors';
import { CreateRatePlanAndAttachToRentalOfferResult as CreateRatePlanAndAttachToRentalOfferHandlerResult } from '../features/create-rate-plan-and-attach-to-rental-offer/create-rate-plan-and-attach-to-rental-offer.handler';
import { PriceConfirmedRentalService } from '../features/price-confirmed-rental/price-confirmed-rental.service';
import {
  AttachRatePlanToRentalOfferInput,
  AttachRatePlanToRentalOfferResult,
  CreateRatePlanAndAttachToRentalOfferInput,
  CreateRatePlanAndAttachToRentalOfferResult,
  PriceConfirmedRentalInput,
  PricingPublicApi,
  PricingPublicApiError,
} from './pricing.public-api';
import { RentalPriceSnapshotV1 } from './rental-price-snapshot.type';
import { PricingError } from '../pricing-engine/errors/pricing.errors';
import { PriceDraftRentalService } from '../features/price-draft-rental/price-draft-rental.service';
import { PriceDraftRentalInput } from '../features/price-draft-rental/price-draft-rental-input.type';

@Injectable()
export class PricingPublicApiService extends PricingPublicApi {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly priceConfirmedRentalService: PriceConfirmedRentalService,
    private readonly priceDraftRentalService: PriceDraftRentalService,
  ) {
    super();
  }

  priceConfirmedRental(input: PriceConfirmedRentalInput): Promise<Result<RentalPriceSnapshotV1, PricingError>> {
    return this.priceConfirmedRentalService.priceConfirmedRental(input);
  }

  priceDraftRental(input: PriceDraftRentalInput): Promise<Result<RentalPriceSnapshotV1, PricingError>> {
    return this.priceDraftRentalService.price(input);
  }

  async createRatePlanAndAttachToRentalOffer(
    input: CreateRatePlanAndAttachToRentalOfferInput,
  ): Promise<Result<CreateRatePlanAndAttachToRentalOfferResult, PricingPublicApiError>> {
    const result = await this.commandBus.execute<
      CreateRatePlanAndAttachToRentalOfferCommand,
      Result<CreateRatePlanAndAttachToRentalOfferHandlerResult, CreateRatePlanAndAttachToRentalOfferError>
    >(new CreateRatePlanAndAttachToRentalOfferCommand(input));

    return result.mapErr(toPricingPublicApiError);
  }

  async attachRatePlanToRentalOffer(
    input: AttachRatePlanToRentalOfferInput,
  ): Promise<Result<AttachRatePlanToRentalOfferResult, PricingPublicApiError>> {
    const result = await this.commandBus.execute<
      AttachRatePlanToRentalOfferCommand,
      Result<AttachRatePlanToRentalOfferHandlerResult, AttachRatePlanToRentalOfferError>
    >(new AttachRatePlanToRentalOfferCommand(input));

    return result
      .map((value) => ({
        ratePlanId: input.ratePlanId,
        rentalOfferPricingId: value.rentalOfferPricingId,
      }))
      .mapErr(toPricingPublicApiError);
  }
}

function toPricingPublicApiError(
  error: AttachRatePlanToRentalOfferError | CreateRatePlanAndAttachToRentalOfferError,
): PricingPublicApiError {
  const publicCodeByFeatureCode = {
    'pricing.rental_offer_not_found': 'RentalOfferNotFound',
    'pricing.rate_plan_not_found': 'RatePlanNotFound',
    'pricing.rate_plan_inactive': 'RatePlanInactive',
    'pricing.rate_plan_name_already_in_use': 'RatePlanNameAlreadyInUse',
    'pricing.invalid_rate_plan': 'InvalidRatePlan',
  } as const;

  return {
    code: publicCodeByFeatureCode[error.code],
    message: error.message,
    cause: error,
  };
}

export type PublicApiBillingUnit = V2BillingUnit;
