import { describe, expect, it } from 'vitest';
import { err, ok } from 'neverthrow';

import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';
import {
  CatalogSelectionResolution,
  CatalogSelectionResolutionError,
} from 'src/modules/catalog/public-api/catalog-selection-resolution.public-api';
import {
  DeliveryQuote,
  DeliveryQuoteService,
  GetDeliveryQuoteInput,
} from 'src/modules/delivery/public-api/delivery-quote.public-api';
import {
  PricingCalculation,
  PricingCalculationError,
  PricingCalculationRequest,
  PricingCalculationResult,
} from 'src/modules/pricing/public-api/pricing-calculation.public-api';

import { FulfillmentMethod } from '../domain/rental-status';
import { RentalPeriod } from '../domain/value-objects/rental-period.value-object';
import { ProspectiveRentalCostService } from './prospective-rental-cost.service';
import { RentalProposalInput, RentalProposalResolver } from './rental-proposal-resolver.service';

const period = new RentalPeriod(new Date('2030-01-07T10:00:00.000Z'), new Date('2030-01-09T10:00:00.000Z'));
const baseInput: RentalProposalInput = {
  tenantId: 'tenant',
  branchId: 'branch',
  period,
  selectedOffers: [{ rentalOfferId: 'offer', quantity: 2 }],
  fulfillmentMethod: FulfillmentMethod.Pickup,
  calculationFacts: {
    effectiveTimezone: 'UTC',
    dailyBillingPolicy: 'BILL_ANY_PARTIAL_DAY',
    weekendCountsAsOne: false,
  },
  pricingIntent: { context: 'DRAFT' },
};

const quote: DeliveryQuote = {
  resolvedCustomerLocation: { formattedAddress: '10 Rental Road', latitude: 40.7, longitude: -74 },
  distanceMeters: 1000,
  currency: 'USD',
  delivery: { scheduledAt: period.start, serviceLevel: 'NORMAL', basePrice: '10', surcharge: '0', total: '10' },
  collection: { scheduledAt: period.end, serviceLevel: 'NORMAL', basePrice: '10', surcharge: '0', total: '10' },
  deliveryTotal: '20',
  transportReservationMinutes: 30,
  calculatedAt: period.start,
};

function pricingResult(request: PricingCalculationRequest): PricingCalculationResult {
  const target = request.targetTotalAdjustment?.targetTotal;
  const breakdown: PricingCalculationResult['calculated'] = {
    currency: 'USD',
    subtotal: '100',
    discountTotal: '0',
    total: '100',
    chargedDays: 2,
    durationPolicy: {
      timezone: 'UTC',
      dailyBillingPolicy: 'BILL_ANY_PARTIAL_DAY',
      weekendCountsAsOne: false,
      minimumChargedDays: 1,
    },
    lines: request.lines.map((line) => ({
      lineReference: line.lineReference,
      rentalOfferId: line.rentalOfferId,
      rentableItemId: line.rentableItemId,
      categoryId: line.categoryId,
      quantity: line.quantity,
      ratePlanId: 'rate',
      billingUnit: 'DAY',
      chargedUnits: 2,
      appliedTier: { tierId: 'tier', fromUnit: 1, toUnit: null, pricePerUnit: '25' },
      subtotal: '100',
      discountTotal: '0',
      total: '100',
      appliedAdjustments: [],
    })),
    appliedPromotions: [],
  };
  return {
    calculatedAt: period.start,
    calculated: breakdown,
    final: target
      ? {
          ...breakdown,
          total: target,
          lines: breakdown.lines.map((line) => ({
            ...line,
            total: target,
            targetTotalAllocation: { direction: 'INCREASE', amount: '25' },
          })),
        }
      : breakdown,
    insurance: { applied: false, amount: '0' },
    totalBeforeInsurance: target ?? '100',
    total: target ?? '100',
    ...(target
      ? {
          targetTotalAdjustment: {
            targetTotal: target,
            previousTotal: '100',
            direction: 'INCREASE' as const,
            adjustmentTotal: '25',
          },
        }
      : {}),
  };
}

describe('RentalProposalResolver', () => {
  function setup() {
    const pricingRequests: PricingCalculationRequest[] = [];
    const deliveryRequests: GetDeliveryQuoteInput[] = [];
    let catalogError: CatalogSelectionResolutionError | undefined;
    let pricingError: PricingCalculationError | undefined;
    let serviceable = true;

    const catalog: CatalogSelectionResolution = {
      async resolveSelectedRentalOffers() {
        if (catalogError) return err(catalogError);
        return ok({
          resolvedOffers: [
            {
              rentalOfferId: 'offer',
              rentableItem: { id: 'item', name: 'Camera kit', kind: 'PACKAGE' as const, categoryId: 'category' },
              branchId: 'branch',
              quantity: 2,
              fulfillmentRequirements: [
                { equipmentTypeId: 'camera', quantityPerItem: 1 },
                { equipmentTypeId: 'lens', quantityPerItem: 3 },
              ],
            },
          ],
        });
      },
      async resolveSelectedRentalOfferRequirements() {
        throw new Error('Not used by proposal resolution');
      },
    };
    const displayFacts: AssetInventoryDisplayFacts = {
      async getEquipmentTypeDisplayFacts({ equipmentTypeIds }) {
        return equipmentTypeIds.map((equipmentTypeId) => ({
          equipmentTypeId,
          name: equipmentTypeId === 'camera' ? 'Camera' : 'Lens',
          categoryId: null,
        }));
      },
      async getAssetDisplayFacts() {
        throw new Error('Not used by proposal resolution');
      },
      async getOwnerDisplayFacts() {
        throw new Error('Not used by proposal resolution');
      },
    };
    const pricing: PricingCalculation = {
      async calculateProposedPrice(request) {
        pricingRequests.push(request);
        return pricingError ? err(pricingError) : ok(pricingResult(request));
      },
      async calculateInsuranceForEquipmentPrice() {
        throw new Error('Not used by proposal resolution');
      },
    };
    const delivery: DeliveryQuoteService = {
      async getQuote(request) {
        deliveryRequests.push(request);
        return serviceable ? { serviceable: true, quote } : { serviceable: false, reason: 'NO_ROUTE' };
      },
    };
    return {
      resolver: new RentalProposalResolver(catalog, displayFacts, new ProspectiveRentalCostService(pricing, delivery)),
      pricingRequests,
      deliveryRequests,
      rejectCatalog(error: CatalogSelectionResolutionError) {
        catalogError = error;
      },
      rejectPricing(error: PricingCalculationError) {
        pricingError = error;
      },
      refuseDelivery() {
        serviceable = false;
      },
    };
  }

  it('links package demand and pricing lines to one selection and snapshots display facts', async () => {
    const { resolver, pricingRequests } = setup();
    const result = await resolver.resolve(baseInput);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;

    const selection = result.value.selections[0];
    expect(selection).toMatchObject({ rentableItemNameSnapshot: 'Camera kit', quantity: 2 });
    expect(result.value.demandLines).toEqual([
      expect.objectContaining({ rentalSelectionId: selection.id, equipmentTypeNameSnapshot: 'Camera', quantity: 2 }),
      expect.objectContaining({ rentalSelectionId: selection.id, equipmentTypeNameSnapshot: 'Lens', quantity: 6 }),
    ]);
    expect(pricingRequests[0].lines).toEqual([
      expect.objectContaining({ lineReference: selection.id, rentalOfferId: 'offer', quantity: 2 }),
    ]);
    expect(result.value.priceSnapshot).toMatchObject({ context: 'DRAFT', total: '100' });
    expect(result.value.priceSnapshot.final.lines[0]).toMatchObject({
      rentalSelectionId: selection.id,
      rentableItemName: 'Camera kit',
    });
    expect(result.value.deliverySnapshot).toBeUndefined();
  });

  it('sends draft adjustments to Pricing and records the author in the snapshot', async () => {
    const { resolver, pricingRequests } = setup();
    const result = await resolver.resolve({
      ...baseInput,
      pricingIntent: {
        context: 'DRAFT',
        manualPricingAdjustment: {
          mode: 'TARGET_TOTAL',
          targetTotal: '125',
          reason: 'Approved quote',
          setByTenantUserId: 'staff',
        },
      },
    });
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(pricingRequests[0].targetTotalAdjustment).toEqual({ targetTotal: '125' });
    expect(result.value.priceSnapshot.manualPricingAdjustment).toMatchObject({
      targetTotal: '125',
      reason: 'Approved quote',
      setByTenantUserId: 'staff',
    });
    expect(result.value.priceSnapshot.final.lines[0].manualPricingAdjustment).toMatchObject({
      amount: '25',
      reason: 'Approved quote',
      setByTenantUserId: 'staff',
    });
  });

  it('resolves delivery and confirmed pricing without an adjustment', async () => {
    const { resolver, pricingRequests, deliveryRequests } = setup();
    const result = await resolver.resolve({
      ...baseInput,
      rentalCustomerId: 'customer',
      fulfillmentMethod: FulfillmentMethod.Delivery,
      deliveryDestination: {
        address: 'Original display address',
        resolvedLocation: quote.resolvedCustomerLocation,
      },
      pricingIntent: { context: 'CONFIRMED' },
    });
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(pricingRequests[0]).toMatchObject({ customerId: 'customer', insuranceSelected: false });
    expect(pricingRequests[0].targetTotalAdjustment).toBeUndefined();
    expect(deliveryRequests[0].customerLocation).toEqual({ resolvedLocation: quote.resolvedCustomerLocation });
    expect(result.value.priceSnapshot).toMatchObject({ context: 'CONFIRMED' });
    expect(result.value.deliveryDetails).toMatchObject({
      address: 'Original display address',
      formattedAddress: '10 Rental Road',
    });
    expect(result.value.deliverySnapshot).toMatchObject({ deliveryTotal: '20', transportReservationMinutes: 30 });
  });

  it('preserves Catalog error cause and duplicate offer context', async () => {
    const { resolver, rejectCatalog } = setup();
    const cause = new CatalogSelectionResolutionError('DuplicateRentalOfferSelection', 'Duplicate offer', {
      rentalOfferId: 'offer',
    });
    rejectCatalog(cause);
    const result = await resolver.resolve(baseInput);
    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error).toMatchObject({
      code: 'rental_commitment.duplicate_rental_offer_selection',
      cause,
      context: { rentalOfferId: 'offer' },
    });
  });

  it('maps Pricing errors and delivery non-serviceability without inventing a cause', async () => {
    const scenario = setup();
    const cause = new PricingCalculationError('pricing_calculation.invalid_request', 'Invalid request');
    scenario.rejectPricing(cause);
    const pricingFailure = await scenario.resolver.resolve(baseInput);
    expect(pricingFailure.isErr()).toBe(true);
    if (pricingFailure.isOk()) return;
    expect(pricingFailure.error).toMatchObject({ code: 'rental_commitment.invalid_pricing_input', cause });

    const deliveryScenario = setup();
    deliveryScenario.refuseDelivery();
    const deliveryFailure = await deliveryScenario.resolver.resolve({
      ...baseInput,
      fulfillmentMethod: FulfillmentMethod.Delivery,
      deliveryDestination: { address: '10 Rental Road', locationId: 'location' },
    });
    expect(deliveryFailure.isErr()).toBe(true);
    if (deliveryFailure.isOk()) return;
    expect(deliveryScenario.deliveryRequests[0].customerLocation).toEqual({
      address: '10 Rental Road',
      locationId: 'location',
    });
    expect(deliveryFailure.error).toMatchObject({
      code: 'rental_commitment.delivery_not_serviceable',
      context: { deliveryReason: 'NO_ROUTE' },
    });
    expect(deliveryFailure.error.cause).toBeUndefined();
  });
});
