import { PrismaService } from 'src/core/database/prisma.service';

import { AssetCreationValidatorService } from './asset-creation-validator.service';

describe('AssetCreationValidatorService', () => {
  it('allows assets with duplicate manufacturer serial numbers', async () => {
    const prisma = {
      client: {
        v2AssetOwner: { findMany: jest.fn() },
      },
    } as unknown as PrismaService;
    const service = new AssetCreationValidatorService(prisma);

    const result = await service.validateAssetsCanBeCreated({
      tenantId: 'tenant-1',
      assets: [{ serialNumber: 'SERIAL-1' }, { serialNumber: ' serial-1 ' }],
    });

    expect(result.isOk()).toBe(true);
    expect(prisma.client.v2AssetOwner.findMany).not.toHaveBeenCalled();
  });
});
