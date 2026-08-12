import { CommandBus } from '@nestjs/cqrs';
import { ok } from 'neverthrow';

import {
  CalculateDraftRentalPriceBodySchema,
  CreateConfirmedRentalBodySchema,
  CreateDraftRentalBodySchema,
  CreateOwnerWithContractBodySchema,
  EditConfirmedRentalBodySchema,
  EditUnconfirmedRentalBodySchema,
  GetRentalOfferAvailabilityRequestSchema,
} from '@repo/api-contracts';

import { CreateOwnerWithContractApplicationInputSchema } from './asset-inventory/features/create-owner-with-contract/create-owner-with-contract.request.dto';
import { CalculateDraftRentalPriceApplicationInputSchema } from './pricing/features/calculate-draft-rental-price/calculate-draft-rental-price.request.dto';
import { CreateConfirmedRentalApplicationInputSchema } from './rental-commitment/features/create-confirmed-rental/create-confirmed-rental.request.dto';
import { CreateDraftRentalApplicationInputSchema } from './rental-commitment/features/create-draft-rental/create-draft-rental.request.dto';
import { EditConfirmedRentalApplicationInputSchema } from './rental-commitment/features/edit-confirmed-rental/edit-confirmed-rental.request.dto';
import { EditUnconfirmedRentalApplicationInputSchema } from './rental-commitment/features/edit-unconfirmed-rental/edit-unconfirmed-rental.request.dto';
import { GetRentalOfferAvailabilityApplicationInputSchema } from './rental-commitment/features/get-rental-offer-availability/get-rental-offer-availability.request.dto';
import { CreateConfirmedRentalCommand } from './rental-commitment/features/create-confirmed-rental/create-confirmed-rental.command';
import { CreateConfirmedRentalHttpController } from './rental-commitment/features/create-confirmed-rental/create-confirmed-rental.controller';
import { RentalPeriod } from './rental-commitment/domain/value-objects/rental-period.value-object';

const period = { start: '2026-08-10T13:00:00Z', end: '2026-08-10T10:30:00-03:00' };
const selectedOffers = [{ rentalOfferId: 'offer-1', quantity: 1 }];

const wireCases = [
  ['owner contract', CreateOwnerWithContractBodySchema, {
    owner: { name: 'Owner' },
    contract: { basis: 'NET', ownerShare: '0.7', rentalShare: '0.3', validFrom: period.start, validTo: period.end },
  }, (body: { contract: { validFrom: string } }) => body.contract.validFrom],
  ['draft price', CalculateDraftRentalPriceBodySchema, { branchId: 'branch-1', period, selectedOffers }, (body: { period: { start: string } }) => body.period.start],
  ['confirmed rental', CreateConfirmedRentalBodySchema, { branchId: 'branch-1', period, selectedOffers }, (body: { period: { start: string } }) => body.period.start],
  ['draft rental', CreateDraftRentalBodySchema, { branchId: 'branch-1', period, selectedOffers }, (body: { period: { start: string } }) => body.period.start],
  ['edit confirmed rental', EditConfirmedRentalBodySchema, { expectedVersion: 0, branchId: 'branch-1', period, selectedOffers }, (body: { period: { start: string } }) => body.period.start],
  ['edit unconfirmed rental', EditUnconfirmedRentalBodySchema, { expectedVersion: 0, branchId: 'branch-1', period, selectedOffers }, (body: { period: { start: string } }) => body.period.start],
  ['offer availability', GetRentalOfferAvailabilityRequestSchema, { branchId: 'branch-1', periodStart: period.start, periodEnd: period.end, rentalOfferIds: ['offer-1'] }, (body: { periodStart: string }) => body.periodStart],
] as const;

describe('instant-bearing request boundaries', () => {
  it.each(wireCases)('%s preserves ISO instants as strings on the wire', (_name, schema, body, instant) => {
    const parsed = schema.parse(body);
    expect(instant(parsed)).toBe(period.start);
    expect(typeof instant(parsed)).toBe('string');
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it.each(wireCases)('%s accepts Z and numeric offsets and rejects offset-less values', (_name, schema, body) => {
    expect(schema.safeParse(body).success).toBe(true);
    const offsetless = structuredClone(body) as Record<string, unknown>;
    if ('period' in offsetless) (offsetless.period as Record<string, string>).start = '2026-08-10T13:00:00';
    else if ('contract' in offsetless) (offsetless.contract as Record<string, string>).validFrom = '2026-08-10T13:00:00';
    else (offsetless as Record<string, string>).periodStart = '2026-08-10T13:00:00';
    expect(schema.safeParse(offsetless).success).toBe(false);
  });

  it('converts instant fields to Dates at every backend application boundary', () => {
    const applicationInputs = [
      CreateOwnerWithContractApplicationInputSchema.parse(wireCases[0][2]),
      CalculateDraftRentalPriceApplicationInputSchema.parse(wireCases[1][2]),
      CreateConfirmedRentalApplicationInputSchema.parse(wireCases[2][2]),
      CreateDraftRentalApplicationInputSchema.parse(wireCases[3][2]),
      EditConfirmedRentalApplicationInputSchema.parse(wireCases[4][2]),
      EditUnconfirmedRentalApplicationInputSchema.parse(wireCases[5][2]),
      GetRentalOfferAvailabilityApplicationInputSchema.parse(wireCases[6][2]),
    ];

    expect(applicationInputs[0].contract.validFrom).toBeInstanceOf(Date);
    for (const input of applicationInputs.slice(1, 6)) {
      expect(input.period.start).toBeInstanceOf(Date);
      expect(() => new RentalPeriod(input.period.start, input.period.end)).not.toThrow();
    }
    expect(applicationInputs[6].periodStart).toBeInstanceOf(Date);
    expect(() => new RentalPeriod(applicationInputs[6].periodStart, applicationInputs[6].periodEnd)).not.toThrow();
  });

  it('passes Date-backed periods from the controller into rental commands', async () => {
    const commandBus = { execute: jest.fn().mockResolvedValue(ok({ rentalId: 'rental-1' })) } as unknown as CommandBus;
    const controller = new CreateConfirmedRentalHttpController(commandBus);
    const dto = CreateConfirmedRentalApplicationInputSchema.parse(wireCases[2][2]);

    await controller.create(dto, { tenantId: 'tenant-1', id: 'customer-1' } as never);

    const command = (commandBus.execute as jest.Mock).mock.calls[0][0] as CreateConfirmedRentalCommand;
    expect(command.period.start).toBeInstanceOf(Date);
    expect(command.period.end).toBeInstanceOf(Date);
  });

  it('keeps owner-contract ordering offset-aware after conversion to Dates', () => {
    const valid = {
      ...wireCases[0][2],
      contract: { ...wireCases[0][2].contract, validFrom: '2026-08-10T12:00:00Z', validTo: '2026-08-10T10:00:00-03:00' },
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
