import { CreatePromotionBodySchema } from '@repo/api-contracts';

describe('CreatePromotionBodySchema validity dates', () => {
  const body = {
    name: 'Promotion',
    activation: 'AUTOMATIC',
    effectType: 'PERCENTAGE_OFF',
    effectValue: '10',
    scopes: [{ type: 'ALL' }],
  };

  it('accepts strict local dates', () => {
    expect(CreatePromotionBodySchema.parse({ ...body, validFrom: '2026-08-10', validUntil: '2026-08-10' })).toMatchObject({
      validFrom: '2026-08-10',
      validUntil: '2026-08-10',
    });
  });

  it.each(['2026-08-10T00:00:00Z', '2026-08-10T10:00:00-03:00', '2026-02-30'])('rejects %s', (value) => {
    expect(() => CreatePromotionBodySchema.parse({ ...body, validFrom: value })).toThrow();
  });
});
