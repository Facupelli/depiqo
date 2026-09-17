import { describe, expect, it } from 'vitest';
import {
  CalculateDraftRentalPriceBodySchema,
  CreateConfirmedRentalBodySchema,
  CreateDraftRentalBodySchema,
  CreateOwnerWithContractBodySchema,
  GetRentalOfferAvailabilityRequestSchema,
  type CalculateDraftRentalPriceBodyDto,
  type CreateConfirmedRentalBodyDto,
  type CreateDraftRentalBodyDto,
  type CreateOwnerWithContractBodyDto,
  type GetRentalOfferAvailabilityRequestDto,
} from '@repo/api-contracts';

import { CreateOwnerWithContractApplicationInputSchema } from './asset-inventory/features/create-owner-with-contract/create-owner-with-contract.request.dto';
import { CalculateDraftRentalPriceApplicationInputSchema } from './pricing/features/calculate-draft-rental-price/calculate-draft-rental-price.request.dto';
import { CreateConfirmedRentalApplicationInputSchema } from './rental-commitment/features/create-confirmed-rental/create-confirmed-rental.request.dto';
import { CreateDraftRentalApplicationInputSchema } from './rental-commitment/features/create-draft-rental/create-draft-rental.request.dto';
import { GetRentalOfferAvailabilityApplicationInputSchema } from './rental-commitment/features/get-rental-offer-availability/get-rental-offer-availability.request.dto';

type TemporalWireBody =
  | CreateOwnerWithContractBodyDto
  | CalculateDraftRentalPriceBodyDto
  | CreateConfirmedRentalBodyDto
  | CreateDraftRentalBodyDto
  | GetRentalOfferAvailabilityRequestDto;

type TemporalWireSchema = {
  parse(data: TemporalWireBody): TemporalWireBody;
  safeParse(data: TemporalWireBody): { success: boolean };
};

type TemporalWireCase = readonly [string, TemporalWireSchema, TemporalWireBody, (body: TemporalWireBody) => string];

const period = { start: '2026-08-10T13:00:00Z', end: '2026-08-10T10:30:00-03:00' };
const selectedOffers = [{ rentalOfferId: 'offer-1', quantity: 1 }];

const wireCases: readonly TemporalWireCase[] = [
  [
    'owner contract',
    CreateOwnerWithContractBodySchema,
    {
      owner: { name: 'Owner' },
      contract: { basis: 'NET', ownerShare: '0.7', rentalShare: '0.3', validFrom: period.start, validTo: period.end },
    },
    instantFromBody,
  ],
  [
    'draft price',
    CalculateDraftRentalPriceBodySchema,
    { branchId: 'branch-1', period, selectedOffers },
    instantFromBody,
  ],
  [
    'confirmed rental',
    CreateConfirmedRentalBodySchema,
    { branchId: 'branch-1', period, selectedOffers, fulfillmentMethod: 'PICKUP' },
    instantFromBody,
  ],
  [
    'draft rental',
    CreateDraftRentalBodySchema,
    { branchId: 'branch-1', period, selectedOffers, fulfillmentMethod: 'PICKUP' },
    instantFromBody,
  ],
  [
    'offer availability',
    GetRentalOfferAvailabilityRequestSchema,
    { branchId: 'branch-1', periodStart: period.start, periodEnd: period.end, rentalOfferIds: ['offer-1'] },
    instantFromBody,
  ],
];

function instantFromBody(body: TemporalWireBody): string {
  if ('period' in body) return body.period.start;
  if ('contract' in body) return body.contract.validFrom;
  return body.periodStart;
}

function withoutOffset(body: TemporalWireBody): TemporalWireBody {
  const offsetless = structuredClone(body);

  if ('period' in offsetless) {
    offsetless.period.start = '2026-08-10T13:00:00';
  } else if ('contract' in offsetless) {
    offsetless.contract.validFrom = '2026-08-10T13:00:00';
  } else {
    offsetless.periodStart = '2026-08-10T13:00:00';
  }

  return offsetless;
}

describe('instant-bearing request boundaries', () => {
  it.each(wireCases)('%s preserves ISO instants as strings on the wire', (_name, schema, body, instant) => {
    const parsed = schema.parse(body);
    expect(instant(parsed)).toBe(period.start);
    expect(typeof instant(parsed)).toBe('string');
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it.each(wireCases)('%s accepts Z and numeric offsets and rejects offset-less values', (_name, schema, body) => {
    expect(schema.safeParse(body).success).toBe(true);
    const offsetless = withoutOffset(body);
    expect(schema.safeParse(offsetless).success).toBe(false);
  });

  it('converts instant fields to Dates at every backend application boundary', () => {
    const ownerInput = CreateOwnerWithContractApplicationInputSchema.parse(wireCases[0][2]);
    const calculateDraftRentalPriceInput = CalculateDraftRentalPriceApplicationInputSchema.parse(wireCases[1][2]);
    const createConfirmedRentalInput = CreateConfirmedRentalApplicationInputSchema.parse(wireCases[2][2]);
    const createDraftRentalInput = CreateDraftRentalApplicationInputSchema.parse(wireCases[3][2]);
    const offerAvailabilityInput = GetRentalOfferAvailabilityApplicationInputSchema.parse(wireCases[4][2]);

    expect(ownerInput.contract.validFrom).toBeInstanceOf(Date);
    expect(calculateDraftRentalPriceInput.period.start).toBeInstanceOf(Date);
    expect(createConfirmedRentalInput.period.start).toBeInstanceOf(Date);
    expect(createDraftRentalInput.period.start).toBeInstanceOf(Date);
    expect(offerAvailabilityInput.periodStart).toBeInstanceOf(Date);
  });

  it('keeps owner-contract ordering offset-aware after conversion to Dates', () => {
    const ownerContractBody = wireCases[0][2];
    if (!('contract' in ownerContractBody)) throw new Error('Expected an owner-contract wire fixture.');

    const valid = {
      ...ownerContractBody,
      contract: {
        ...ownerContractBody.contract,
        validFrom: '2026-08-10T12:00:00Z',
        validTo: '2026-08-10T10:00:00-03:00',
      },
    };
    const invalid = {
      ...valid,
      contract: { ...valid.contract, validTo: '2026-08-10T08:00:00-03:00' },
    };

    expect(CreateOwnerWithContractBodySchema.parse(valid).contract.validTo).toBe(valid.contract.validTo);
    expect(CreateOwnerWithContractApplicationInputSchema.safeParse(valid).success).toBe(true);
    expect(CreateOwnerWithContractApplicationInputSchema.safeParse(invalid).success).toBe(false);
  });
});
