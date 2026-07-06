import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { V2BillingUnit } from 'src/generated/prisma/client';
import { AttachRatePlanToRentalOfferApplicationError } from '../features/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer-application.error';
import { AttachRatePlanToRentalOfferCommand } from '../features/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer.command';
import { AttachRatePlanToRentalOfferResult as AttachRatePlanToRentalOfferHandlerResult } from '../features/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer.handler';
import { CreateRatePlanAndAttachToRentalOfferApplicationError } from '../features/create-rate-plan-and-attach-to-rental-offer/create-rate-plan-and-attach-to-rental-offer-application.error';
import { CreateRatePlanAndAttachToRentalOfferCommand } from '../features/create-rate-plan-and-attach-to-rental-offer/create-rate-plan-and-attach-to-rental-offer.command';
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
    return this.commandBus.execute<
      CreateRatePlanAndAttachToRentalOfferCommand,
      Result<CreateRatePlanAndAttachToRentalOfferHandlerResult, CreateRatePlanAndAttachToRentalOfferApplicationError>
    >(new CreateRatePlanAndAttachToRentalOfferCommand(input));
  }

  async attachRatePlanToRentalOffer(
    input: AttachRatePlanToRentalOfferInput,
  ): Promise<Result<AttachRatePlanToRentalOfferResult, PricingPublicApiError>> {
    const result = await this.commandBus.execute<
      AttachRatePlanToRentalOfferCommand,
      Result<AttachRatePlanToRentalOfferHandlerResult, AttachRatePlanToRentalOfferApplicationError>
    >(new AttachRatePlanToRentalOfferCommand(input));

    return result.map((value) => ({
      ratePlanId: input.ratePlanId,
      rentalOfferPricingId: value.rentalOfferPricingId,
    }));
  }
}

export type PublicApiBillingUnit = V2BillingUnit;
