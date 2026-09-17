import { describe, expect, it, vi } from 'vitest';
import { CommittedRentalSelectionsAndDemandService } from './committed-rental-selections-and-demand.service';

describe('CommittedRentalSelectionsAndDemandService', () => {
  it('projects current demand quantity as operational quantity without exposing suppression internals', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      selections: [],
      demandLines: [
        {
          id: 'demand-1',
          rentalSelectionId: 'selection-1',
          equipmentTypeId: 'equipment-type-1',
          equipmentTypeNameSnapshot: 'Tripod',
          quantity: 3,
          removedQuantity: 1,
        },
      ],
    });
    // SAFETY: This focused test double implements every member exercised by the subject; unimplemented framework or service members are never accessed.
    const service = new CommittedRentalSelectionsAndDemandService({
      client: { v2Rental: { findFirst } },
    } as never);

    const result = await service.getCommittedRentalSelectionsAndDemand({
      tenantId: 'tenant-1',
      rentalId: 'rental-1',
    });

    expect(result._unsafeUnwrap().demandLines).toEqual([
      {
        demandLineId: 'demand-1',
        sourceSelectionId: 'selection-1',
        equipmentTypeId: 'equipment-type-1',
        equipmentTypeNameSnapshot: 'Tripod',
        quantity: 2,
      },
    ]);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          demandLines: expect.objectContaining({ where: { removedAt: null } }),
        }),
      }),
    );
  });
});
