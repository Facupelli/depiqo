import {
  CalculateCartPriceBodySchema,
  ExplicitOffsetInstantSchema,
  ExplicitOffsetInstantWireSchema,
} from '@repo/api-contracts';
import { QueryBus } from '@nestjs/cqrs';
import { ok } from 'neverthrow';

import { CalculateCartPriceHttpController } from './calculate-cart-price.controller';
import { CalculateCartPriceApplicationInputSchema } from './calculate-cart-price.request.dto';
import { CalculateCartPriceQuery } from './calculate-cart-price.query';

const cartPriceBody = {
  branchId: 'branch-1',
  rentalPeriod: {
    start: '2026-08-10T13:00:00Z',
    end: '2026-08-11T10:00:00-03:00',
  },
  selectedOffers: [{ rentalOfferId: 'offer-1', quantity: 1 }],
  insuranceSelected: false,
};

describe('CalculateCartPrice request schemas', () => {
  it.each(['2026-08-10T13:00:00Z', '2026-08-10T10:00:00-03:00'])(
    'preserves valid explicit-offset instants at the wire boundary: %s',
    (value) => {
      expect(ExplicitOffsetInstantWireSchema.parse(value)).toBe(value);
    },
  );

  it('keeps the application instant parser date-based', () => {
    const parsed = ExplicitOffsetInstantSchema.parse(cartPriceBody.rentalPeriod.start);

    expect(parsed).toBeInstanceOf(Date);
    expect(parsed.getTime()).toBe(Date.parse(cartPriceBody.rentalPeriod.start));
  });

  it('keeps cart-price contract instants as strings across repeated wire validation', () => {
    const firstBoundary = CalculateCartPriceBodySchema.parse(cartPriceBody);
    const secondBoundary = CalculateCartPriceBodySchema.parse(firstBoundary);

    expect(secondBoundary).toEqual(cartPriceBody);
    expect(typeof secondBoundary.rentalPeriod.start).toBe('string');
    expect(typeof secondBoundary.rentalPeriod.end).toBe('string');
  });

  it.each(['2026-08-10T13:00:00', '2026-08-10'])('rejects a non-offset instant: %s', (value) => {
    expect(() => ExplicitOffsetInstantWireSchema.parse(value)).toThrow();
    expect(() => ExplicitOffsetInstantSchema.parse(value)).toThrow();
  });

  it('converts cart-price instants to dates once at the backend HTTP boundary', async () => {
    const dto = CalculateCartPriceApplicationInputSchema.parse(cartPriceBody);
    const queryBus = {
      execute: jest.fn().mockResolvedValue(ok({})),
    } as unknown as QueryBus;
    const controller = new CalculateCartPriceHttpController(queryBus);

    await controller.calculateCartPrice(dto, { tenantId: 'tenant-1' } as never);

    const query = (queryBus.execute as jest.Mock).mock.calls[0][0] as CalculateCartPriceQuery;
    expect(query.rentalPeriodStart).toBeInstanceOf(Date);
    expect(query.rentalPeriodEnd).toBeInstanceOf(Date);
    expect(query.rentalPeriodStart.getTime()).toBe(Date.parse(cartPriceBody.rentalPeriod.start));
    expect(query.rentalPeriodEnd.toISOString()).toBe('2026-08-11T13:00:00.000Z');
  });
});
