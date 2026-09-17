import { err, ok } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import { InsufficientAssetAvailabilityError } from '../../domain/errors/rental-commitment.errors';
import { RentalStatus } from '../../domain/rental-status';
import { Rental } from '../../domain/rental.aggregate';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalRepository } from '../../persistence/rental.repository';
import { RestoreConfirmedPackageDemandLineCommand } from './restore-confirmed-package-demand-line.command';
import { RestoreConfirmedPackageDemandLineHandler } from './restore-confirmed-package-demand-line.handler';

describe('RestoreConfirmedPackageDemandLineHandler', () => {
  const operationTime = new Date('2030-01-02T12:00:00.000Z');
  const tx = {};
  const integrationEvents = { collect: jest.fn() };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(operationTime);
    integrationEvents.collect.mockClear();
  });

  afterEach(() => jest.useRealTimers());

  function createRental() {
    const demandLine = {
      id: 'demand-1',
      rentalSelectionId: 'selection-1',
      equipmentTypeId: 'equipment-type-1',
      quantity: 3,
      removedQuantity: 2,
      isCurrent: true,
    };
    const rental = {
      id: 'rental-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      version: 7,
      status: RentalStatus.Confirmed,
      period: { start: new Date('2030-01-01T00:00:00.000Z'), end: new Date('2030-01-05T00:00:00.000Z') },
      acceptedDelivery: undefined,
      demandLines: [demandLine],
      selections: [{ id: 'selection-1', rentableItemKindSnapshot: 'PACKAGE', isCurrent: true }],
      currentSelections: [{ id: 'selection-1' }],
      currentDemandLines: [demandLine],
      currentAssignedAssets: [],
      confirmedPriceSnapshot: {
        snapshot: { final: { currency: 'ARS', lines: [{ rentalSelectionId: 'selection-1', total: '100' }] } },
      },
      requireAcceptedAssetBuffer: jest.fn().mockReturnValue({
        beforeBufferMinutes: 60,
        afterBufferMinutes: 120,
      }),
      restoreConfirmedPackageDemandLine: jest.fn().mockReturnValue(ok(undefined)),
      pullDomainEvents: jest.fn().mockReturnValue([]),
    } as Rental;
    return { rental, demandLine };
  }

  function createHandler(rental: Rental, allocationResult = ok({ allocations: [] })) {
    const rentalRepository = {
      findById: jest.fn().mockResolvedValue(rental),
      save: jest.fn().mockResolvedValue({ version: 8, updatedAt: new Date('2030-01-02T12:00:01.000Z') }),
    } as RentalRepository;
    const allocation = {
      planAllocations: jest.fn().mockResolvedValue(allocationResult),
    } as RentalAssetAllocationService;
    const splitCalculator = {
      calculate: jest.fn().mockReturnValue({ splits: [] }),
    } as RentalOwnerSplitCalculator;
    const unitOfWork = {
      runInTransaction: jest.fn((callback) => callback({ tx, integrationEvents })),
    } as PrismaUnitOfWork;
    return {
      handler: new RestoreConfirmedPackageDemandLineHandler(rentalRepository, allocation, splitCalculator, unitOfWork),
      rentalRepository,
      allocation,
      splitCalculator,
    };
  }

  const command = new RestoreConfirmedPackageDemandLineCommand({
    tenantId: 'tenant-1',
    tenantUserId: 'user-1',
    rentalId: 'rental-1',
    demandLineId: 'demand-1',
    expectedVersion: 7,
    quantity: 1,
  });

  it('allocates persisted removed demand before restoring and saves owner splits atomically', async () => {
    const { rental } = createRental();
    const allocationResult = ok({
      allocations: [
        {
          rentalDemandLineId: 'demand-1',
          assetId: 'asset-1',
          ownershipSnapshot: { kind: 'TENANT_OWNED' },
        },
      ],
    });
    const { handler, rentalRepository, allocation, splitCalculator } = createHandler(rental, allocationResult);

    const result = await handler.execute(command);

    expect(result.isOk()).toBe(true);
    expect(allocation.planAllocations).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        demandLines: [
          {
            rentalDemandLineId: 'demand-1',
            rentalSelectionId: 'selection-1',
            equipmentTypeId: 'equipment-type-1',
            quantity: 1,
          },
        ],
        tx,
      }),
    );
    expect((allocation.planAllocations as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (rental.restoreConfirmedPackageDemandLine as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(rental.restoreConfirmedPackageDemandLine).toHaveBeenCalledWith({
      demandLineId: 'demand-1',
      quantity: 1,
      assignedAssets: [
        {
          rentalDemandLineId: 'demand-1',
          assetId: 'asset-1',
          ownershipSnapshot: { kind: 'TENANT_OWNED' },
        },
      ],
      operationTime,
    });
    expect(splitCalculator.calculate).toHaveBeenCalled();
    expect(rentalRepository.save).toHaveBeenCalledWith(rental, {
      expectedVersion: 7,
      ownerSplits: [],
      tx,
    });
    expect(integrationEvents.collect).toHaveBeenCalledWith([]);
  });

  it('does not mutate or save when allocation is insufficient', async () => {
    const { rental } = createRental();
    const { handler, rentalRepository } = createHandler(
      rental,
      err(new InsufficientAssetAvailabilityError('equipment-type-1', 'selection-1', 1, 0)),
    );

    const result = await handler.execute(command);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe('rental_commitment.insufficient_asset_availability');
    expect(rental.restoreConfirmedPackageDemandLine).not.toHaveBeenCalled();
    expect(rentalRepository.save).not.toHaveBeenCalled();
    expect(integrationEvents.collect).not.toHaveBeenCalled();
  });

  it.each([
    ['removed parent', { rentableItemKindSnapshot: 'PACKAGE', isCurrent: false }],
    ['non-package parent', { rentableItemKindSnapshot: 'SINGLE', isCurrent: false }],
  ])('rejects a %s before allocation', async (_name, parentState) => {
    const { rental } = createRental();
    Object.assign(rental.selections[0], parentState);
    const { handler, rentalRepository, allocation } = createHandler(rental);

    const result = await handler.execute(command);

    expect(result.isErr() && result.error.code).toBe('rental_commitment.invalid_rental_field');
    expect(allocation.planAllocations).not.toHaveBeenCalled();
    expect(rentalRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a fully operational demand line before allocation', async () => {
    const { rental, demandLine } = createRental();
    Object.assign(demandLine, { removedQuantity: 0 });
    const { handler, rentalRepository, allocation } = createHandler(rental);

    const result = await handler.execute(command);

    expect(result.isErr() && result.error.code).toBe('rental_commitment.rental_demand_line_already_current');
    expect(allocation.planAllocations).not.toHaveBeenCalled();
    expect(rentalRepository.save).not.toHaveBeenCalled();
  });

  it('rejects restoration exceeding suppressed quantity before allocation', async () => {
    const { rental } = createRental();
    const { handler, rentalRepository, allocation } = createHandler(rental);
    const result = await handler.execute(
      new RestoreConfirmedPackageDemandLineCommand({ ...command.props, quantity: 3 }),
    );

    expect(result.isErr() && result.error.code).toBe('rental_commitment.invalid_rental_field');
    expect(allocation.planAllocations).not.toHaveBeenCalled();
    expect(rentalRepository.save).not.toHaveBeenCalled();
  });

  it('rejects an ended rental before allocation', async () => {
    const { rental } = createRental();
    Object.assign(rental, { period: { start: new Date('2029-01-01'), end: operationTime } });
    const { handler, rentalRepository, allocation } = createHandler(rental);

    const result = await handler.execute(command);

    expect(result.isErr() && result.error.code).toBe('rental_commitment.rental_period_ended');
    expect(allocation.planAllocations).not.toHaveBeenCalled();
    expect(rentalRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a stale version before allocation', async () => {
    const { rental } = createRental();
    Object.assign(rental, { version: 8 });
    const { handler, rentalRepository, allocation } = createHandler(rental);

    const result = await handler.execute(command);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe('rental_commitment.rental_version_conflict');
    expect(allocation.planAllocations).not.toHaveBeenCalled();
    expect(rentalRepository.save).not.toHaveBeenCalled();
  });
});
