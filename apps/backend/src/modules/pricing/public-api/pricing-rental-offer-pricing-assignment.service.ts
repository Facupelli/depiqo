import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AttachRatePlanToRentalOfferCommand } from '../features/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer.command';
import { AttachRatePlanToRentalOfferError } from '../features/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer.errors';
import { AttachRatePlanToRentalOfferResult } from '../features/attach-rate-plan-to-rental-offer/attach-rate-plan-to-rental-offer.handler';
import {
  AssignPricingRatePlanToRentalOfferInput,
  AssignPricingRatePlanToRentalOfferResult,
  PricingRentalOfferPricingAssignment,
  PricingRentalOfferPricingAssignmentError,
} from './pricing-rental-offer-pricing-assignment.public-api';

@Injectable()
export class PricingRentalOfferPricingAssignmentService extends PricingRentalOfferPricingAssignment {
  constructor(private readonly commandBus: CommandBus) {
    super();
  }

  async assignRatePlanToRentalOffer(
    input: AssignPricingRatePlanToRentalOfferInput,
  ): Promise<Result<AssignPricingRatePlanToRentalOfferResult, PricingRentalOfferPricingAssignmentError>> {
    const result = await this.commandBus.execute<
      AttachRatePlanToRentalOfferCommand,
      Result<AttachRatePlanToRentalOfferResult, AttachRatePlanToRentalOfferError>
    >(new AttachRatePlanToRentalOfferCommand(input));

    return result.mapErr((error) => {
      const publicCodeByFeatureCode = {
        'pricing.rental_offer_not_found': 'RentalOfferNotFound',
        'pricing.rate_plan_not_found': 'RatePlanNotFound',
        'pricing.rate_plan_inactive': 'RatePlanInactive',
      } as const;

      return new PricingRentalOfferPricingAssignmentError(publicCodeByFeatureCode[error.code], error.message);
    });
  }
}
