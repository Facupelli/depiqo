import { Injectable } from '@nestjs/common';
import { Result } from 'neverthrow';

import { PricingError } from '../pricing-engine/errors/pricing.errors';
import { PriceConfirmedRentalService } from '../features/price-confirmed-rental/price-confirmed-rental.service';
import { PriceDraftRentalInput } from '../features/price-draft-rental/price-draft-rental-input.type';
import { PriceDraftRentalService } from '../features/price-draft-rental/price-draft-rental.service';
import { PriceConfirmedRentalInput, PricingPublicApi } from './pricing.public-api';
import { RentalPriceSnapshotV1 } from './rental-price-snapshot.type';

@Injectable()
export class PricingPublicApiService extends PricingPublicApi {
  constructor(
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
}
