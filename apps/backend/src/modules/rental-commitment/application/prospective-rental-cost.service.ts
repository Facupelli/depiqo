import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import {
  CustomerLocationSelection,
  DeliveryQuote,
  DeliveryQuoteNonServiceabilityReason,
  DeliveryQuoteService,
} from '../../delivery/public-api/delivery-quote.public-api';
import {
  PricingCalculation,
  PricingCalculationError,
  PricingCalculationRequest,
  PricingCalculationResult,
} from '../../pricing/public-api/pricing-calculation.public-api';
import {
  rentalCommitmentApplicationError,
  RentalCommitmentApplicationError,
} from './rental-commitment-application.error';

export type ProspectiveRentalCostInput = {
  pricing: PricingCalculationRequest;
} & (
  | { fulfillmentMethod: 'PICKUP' }
  | {
      fulfillmentMethod: 'DELIVERY';
      branchId: string;
      customerLocation: CustomerLocationSelection;
    }
);

export type ProspectiveRentalCostOutcome =
  | {
      available: true;
      pricing: PricingCalculationResult;
      deliveryQuote?: DeliveryQuote;
      customerTotal: string;
      currency: string;
    }
  | {
      available: false;
      reason: DeliveryQuoteNonServiceabilityReason;
    };

export type ProspectiveRentalCostResult = Result<
  ProspectiveRentalCostOutcome,
  PricingCalculationError | RentalCommitmentApplicationError
>;

@Injectable()
export class ProspectiveRentalCostService {
  constructor(
    private readonly pricingCalculation: PricingCalculation,
    private readonly deliveryQuoteService: DeliveryQuoteService,
  ) {}

  async calculate(input: ProspectiveRentalCostInput): Promise<ProspectiveRentalCostResult> {
    const pricingResult = await this.pricingCalculation.calculateProposedPrice(input.pricing);
    if (pricingResult.isErr()) return err(pricingResult.error);

    const pricing = pricingResult.value;
    const currency = pricing.final.currency;

    if (input.fulfillmentMethod === 'PICKUP') {
      return ok({
        available: true,
        pricing,
        customerTotal: pricing.total,
        currency,
      });
    }

    const deliveryOutcome = await this.deliveryQuoteService.getQuote({
      tenantId: input.pricing.tenantId,
      branchId: input.branchId,
      customerLocation: input.customerLocation,
      rentalStart: input.pricing.rentalPeriod.start,
      rentalEnd: input.pricing.rentalPeriod.end,
    });

    if (!deliveryOutcome.serviceable) {
      return ok({ available: false, reason: deliveryOutcome.reason });
    }

    const deliveryQuote = deliveryOutcome.quote;
    if (currency !== deliveryQuote.currency) {
      return err(
        rentalCommitmentApplicationError(
          'RentalCommitmentUnexpected',
          `Pricing currency ${currency} does not match Delivery currency ${deliveryQuote.currency}.`,
        ),
      );
    }

    return ok({
      available: true,
      pricing,
      deliveryQuote,
      customerTotal: new Decimal(pricing.total).plus(deliveryQuote.deliveryTotal).toString(),
      currency,
    });
  }
}
