import { ok } from 'neverthrow';

import { AssetCreationValidatorService } from './asset-creation-validator.service';
import { AssetOwnershipResolver } from './asset-ownership-resolver.service';

describe('AssetCreationValidatorService', () => {
  it('allows assets with duplicate manufacturer serial numbers', async () => {
    const ownershipResolver = {
      resolveOwnerships: jest.fn().mockResolvedValue(ok(new Map())),
    } as unknown as AssetOwnershipResolver;
    const service = new AssetCreationValidatorService(ownershipResolver);

    const result = await service.validateAssetsCanBeCreated({
      tenantId: 'tenant-1',
      assets: [{ serialNumber: 'SERIAL-1' }, { serialNumber: ' serial-1 ' }],
    });

    expect(result.isOk()).toBe(true);
    expect(ownershipResolver.resolveOwnerships).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      ownerIds: [],
      now: expect.any(Date),
    });
  });
});
