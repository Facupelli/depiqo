import { RentalPhysicalAssignmentsService } from './rental-physical-assignments.service';

describe('RentalPhysicalAssignmentsService', () => {
  it('queries and exposes only open equipment assignments', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      demandLines: [{ id: 'demand-1', assignedAssets: [{ assetId: 'current-asset' }] }],
      accessorySelections: [],
    });
    const service = new RentalPhysicalAssignmentsService({
      client: { v2Rental: { findFirst } },
    } as never);

    const result = await service.getRentalPhysicalAssignments({ tenantId: 'tenant-1', rentalId: 'rental-1' });

    expect(result._unsafeUnwrap().demandAssignments).toEqual([
      { demandLineId: 'demand-1', assignedAssetIds: ['current-asset'] },
    ]);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          demandLines: expect.objectContaining({
            select: expect.objectContaining({
              assignedAssets: expect.objectContaining({ where: { effectiveUntil: null } }),
            }),
          }),
        }),
      }),
    );
  });
});
