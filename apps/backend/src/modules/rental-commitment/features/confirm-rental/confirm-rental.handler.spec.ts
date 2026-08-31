import { ok } from 'neverthrow';

import { PrismaUnitOfWork, PrismaTransactionContext } from 'src/core/database/prisma-unit-of-work';
import { IntegrationEvent } from 'src/core/domain/events/integration-event';
import { InMemoryIntegrationEventsCollector } from 'src/core/domain/events/in-memory-integration-events.collector';
import { PostgresExclusionViolationError } from 'src/core/utils/postgres-error.mapper';

import { RentalOperationalFactsValidatorService } from '../../application/rental-operational-facts-validator.service';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import { Rental } from '../../domain/rental.aggregate';
import { RentalConfirmedDomainEvent } from '../../domain/events/rental-lifecycle.domain-events';
import { FulfillmentMethod, RentalStatus } from '../../domain/rental-status';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import { RentalRepository } from '../../persistence/rental.repository';
import { ConfirmRentalCommand } from './confirm-rental.command';
import { ConfirmRentalHandler } from './confirm-rental.handler';

describe('ConfirmRentalHandler deadlock retry', () => {
  const tenantId = 'tenant-1';
  const rentalId = 'rental-1';
  const expectedVersion = 7;
  const splits = [{ rentalId: 'split-marker' }];

  it('retries once with the original expected version, succeeds, and collects one event', async () => {
    const setup = createSetup();
    setup.save.mockRejectedValueOnce(deadlockError()).mockResolvedValueOnce({ version: 8, updatedAt: new Date() });

    const result = await setup.handler.execute(new ConfirmRentalCommand(tenantId, rentalId));

    expect(result.isOk()).toBe(true);
    expect(setup.runInTransaction).toHaveBeenCalledTimes(2);
    expect(setup.save).toHaveBeenCalledTimes(2);
    expect(setup.save.mock.calls.map(([, options]) => options?.expectedVersion)).toEqual([
      expectedVersion,
      expectedVersion,
    ]);
    expect(setup.publishedEvents).toHaveLength(1);
    expect(setup.pullDomainEvents).toHaveBeenCalledTimes(1);
  });

  it('maps an exclusion violation from the retry to insufficient availability', async () => {
    const setup = createSetup();
    setup.save
      .mockRejectedValueOnce(deadlockError())
      .mockRejectedValueOnce(new PostgresExclusionViolationError({ code: '23P01' }));

    const result = await setup.handler.execute(new ConfirmRentalCommand(tenantId, rentalId));

    expect(result.isErr() && result.error.code).toBe('rental_commitment.insufficient_asset_availability');
    expect(setup.runInTransaction).toHaveBeenCalledTimes(2);
    expect(setup.pullDomainEvents).not.toHaveBeenCalled();
    expect(setup.publishedEvents).toHaveLength(0);
  });

  it('does not retry an unrelated error', async () => {
    const setup = createSetup();
    const failure = new Error('database unavailable');
    setup.save.mockRejectedValueOnce(failure);

    await expect(setup.handler.execute(new ConfirmRentalCommand(tenantId, rentalId))).rejects.toBe(failure);
    expect(setup.runInTransaction).toHaveBeenCalledTimes(1);
    expect(setup.save).toHaveBeenCalledTimes(1);
  });

  it('does not retry a second deadlock', async () => {
    const setup = createSetup();
    const secondDeadlock = deadlockError();
    setup.save.mockRejectedValueOnce(deadlockError()).mockRejectedValueOnce(secondDeadlock);

    await expect(setup.handler.execute(new ConfirmRentalCommand(tenantId, rentalId))).rejects.toBe(secondDeadlock);
    expect(setup.runInTransaction).toHaveBeenCalledTimes(2);
    expect(setup.save).toHaveBeenCalledTimes(2);
  });

  function createSetup() {
    const event = new RentalConfirmedDomainEvent(
      tenantId,
      rentalId,
      10,
      'customer-1',
      'branch-1',
      RentalStatus.Confirmed,
      FulfillmentMethod.Pickup,
      new Date('2030-01-01T10:00:00.000Z'),
      new Date('2030-01-01T12:00:00.000Z'),
    );
    const pullDomainEvents = jest.fn().mockReturnValueOnce([event]);
    const rental = {
      id: rentalId,
      tenantId,
      branchId: 'branch-1',
      rentalCustomerId: 'customer-1',
      fulfillmentMethod: FulfillmentMethod.Pickup,
      version: expectedVersion,
      period: {
        start: new Date('2030-01-01T10:00:00.000Z'),
        end: new Date('2030-01-01T12:00:00.000Z'),
      },
      demandLines: [
        { id: 'line-1', rentalSelectionId: 'selection-1', equipmentTypeId: 'equipment-type-1', quantity: 1 },
      ],
      selections: [{ id: 'selection-1' }],
      currentAssignedAssets: [
        {
          id: 'assignment-1',
          rentalDemandLineId: 'line-1',
          assetId: 'asset-1',
          ownershipSnapshot: { toJSON: () => ({ kind: 'TENANT_OWNED' }) },
        },
      ],
      confirmedPriceSnapshot: {
        snapshot: {
          final: {
            currency: 'USD',
            lines: [{ rentalSelectionId: 'selection-1', total: '100.00' }],
          },
        },
      },
      confirm: jest.fn().mockReturnValue(ok(undefined)),
      pullDomainEvents,
    } as unknown as Rental;

    const save = jest.fn();
    const repository = {
      findById: jest.fn().mockResolvedValue(rental),
      save,
    } as unknown as RentalRepository;
    const operationalFacts = {
      validateDraftFacts: jest.fn().mockResolvedValue(ok(undefined)),
    } as unknown as RentalOperationalFactsValidatorService;
    const allocation = {
      planAllocations: jest.fn().mockResolvedValue(
        ok({
          allocations: [
            {
              rentalDemandLineId: 'line-1',
              assetId: 'asset-1',
              ownershipSnapshot: { kind: 'TENANT_OWNED' },
            },
          ],
        }),
      ),
    } as unknown as RentalAssetAllocationService;
    const bufferSettings = {
      getTenantRentalAssetBufferSettings: jest
        .fn()
        .mockResolvedValue(ok({ beforeBufferMinutes: 0, afterBufferMinutes: 0 })),
    };
    const ownerSplitCalculator = {
      calculate: jest.fn().mockReturnValue({ splits }),
    } as unknown as RentalOwnerSplitCalculator;
    const publishedEvents: IntegrationEvent[] = [];
    const runInTransaction = jest.fn(async (work: (context: PrismaTransactionContext) => Promise<unknown>) => {
      const integrationEvents = new InMemoryIntegrationEventsCollector();
      const result = await work({ tx: {} as PrismaTransactionContext['tx'], integrationEvents });
      publishedEvents.push(...integrationEvents.drain());
      return result;
    });
    const unitOfWork = { runInTransaction } as unknown as PrismaUnitOfWork;

    return {
      handler: new ConfirmRentalHandler(
        repository,
        operationalFacts,
        bufferSettings as never,
        allocation,
        ownerSplitCalculator,
        unitOfWork,
      ),
      publishedEvents,
      pullDomainEvents,
      runInTransaction,
      save,
    };
  }
});

function deadlockError(): Record<string, unknown> {
  return {
    code: 'P2010',
    meta: {
      driverAdapterError: {
        cause: { kind: 'postgres', code: '40P01' },
      },
    },
  };
}
