import Decimal from 'decimal.js';

import { PricingRentalOfferStartingPriceFact } from 'src/modules/pricing/public-api/pricing-rental-offer-starting-price-facts.public-api';

export interface OfferingManagementStartingPrice {
  amount: string;
  currency: string;
  billingUnit: PricingRentalOfferStartingPriceFact['billingUnit'];
}

export function selectStartingPrice(
  rentalOfferIds: string[],
  pricingFactByOfferId: ReadonlyMap<string, PricingRentalOfferStartingPriceFact>,
): OfferingManagementStartingPrice | null {
  const candidates = rentalOfferIds.flatMap((id) => {
    const candidate = pricingFactByOfferId.get(id);
    return candidate ? [candidate] : [];
  });
  if (candidates.length === 0) return null;

  const currencies = new Set(candidates.map(({ currency }) => currency));
  const billingUnits = new Set(candidates.map(({ billingUnit }) => billingUnit));
  if (currencies.size !== 1 || billingUnits.size !== 1) return null;

  const lowest = candidates.reduce((current, candidate) =>
    new Decimal(candidate.amount).lessThan(new Decimal(current.amount)) ? candidate : current,
  );
  return {
    amount: lowest.amount,
    currency: lowest.currency,
    billingUnit: lowest.billingUnit,
  };
}
