import { describe, expect, it, vi } from 'vitest';
import { ok } from 'neverthrow';

import { AssetCreationValidatorService } from './asset-creation-validator.service';
import { AssetOwnershipResolver } from './asset-ownership-resolver.service';

describe('AssetCreationValidatorService', () => {
  it('allows assets with duplicate manufacturer serial numbers', async () => {
    // SAFETY: This focused test double implements every member exercised by the subject; unimplemented framework or service members are never accessed.
    const ownershipResolver = {
      resolveOwnerships: vi.fn().mockResolvedValue(ok(new Map())),
    } as AssetOwnershipResolver;
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
