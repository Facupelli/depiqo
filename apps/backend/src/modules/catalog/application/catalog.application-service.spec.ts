import { RentalItemKind } from '@repo/types';

import { PrismaService } from 'src/core/database/prisma.service';
import { ProductTypeInactiveForBookingError } from '../catalog.public-api';
import { CatalogApplicationService } from './catalog.application-service';

describe('CatalogApplicationService', () => {
  it('rejects accessory product types for booking eligibility', async () => {
    const prisma = {
      client: {
        productType: {
          findUnique: jest.fn(async () => ({
            id: 'accessory-1',
            tenantId: 'tenant-1',
            categoryId: null,
            kind: RentalItemKind.ACCESSORY,
            retiredAt: null,
            publishedAt: new Date('2026-01-01T00:00:00.000Z'),
            pricingTiers: [{ id: 'tier-1' }],
          })),
        },
      },
    } as unknown as PrismaService;

    const service = new CatalogApplicationService(prisma);

    await expect(
      service.getProductTypeBookingEligibility('tenant-1', 'location-1', 'accessory-1'),
    ).rejects.toBeInstanceOf(ProductTypeInactiveForBookingError);
  });
});
