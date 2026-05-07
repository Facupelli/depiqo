import { QueryBus } from '@nestjs/cqrs';
import { RentalItemKind } from '@repo/types';

import { PrismaService } from 'src/core/database/prisma.service';
import { GetRentalProductTypesQuery } from './get-rental-product-types.query';
import { GetRentalProductTypesQueryHandler } from './get-rental-product-types.query-handler';

describe('GetRentalProductTypesQueryHandler', () => {
  it('does not expose accessory product types in the public rental catalog', async () => {
    const findMany = jest.fn(async () => []);
    const prisma = {
      client: {
        $queryRaw: jest.fn().mockResolvedValueOnce([{ id: 'accessory-1' }]).mockResolvedValueOnce([{ total: 1n }]),
        productType: { findMany },
      },
    } as unknown as PrismaService;
    const queryBus = { execute: jest.fn() } as unknown as QueryBus;
    const handler = new GetRentalProductTypesQueryHandler(prisma, queryBus);

    const result = await handler.execute(new GetRentalProductTypesQuery('tenant-1', 'location-1', undefined, undefined));

    expect(result.data).toEqual([]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['accessory-1'] },
          kind: RentalItemKind.PRIMARY,
        }),
      }),
    );
  });
});
