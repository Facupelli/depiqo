import { CommandBus } from '@nestjs/cqrs';
import { err, ok } from 'neverthrow';

import { ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { RemoveConfirmedPackageDemandLineCommand } from './remove-confirmed-package-demand-line.command';
import { RemoveConfirmedPackageDemandLineHttpController } from './remove-confirmed-package-demand-line.controller';
import { removeConfirmedPackageDemandLineError } from './remove-confirmed-package-demand-line.errors';
import {
  RemoveConfirmedPackageDemandLineParamsDto,
  RemoveConfirmedPackageDemandLineRequestDto,
} from './remove-confirmed-package-demand-line.request.dto';

describe('RemoveConfirmedPackageDemandLineHttpController', () => {
  const params = {
    rentalId: 'rental-1',
    demandLineId: 'demand-line-1',
  } as RemoveConfirmedPackageDemandLineParamsDto;
  const dto = {
    expectedVersion: 7,
    quantity: 1,
    releaseAssetIds: ['asset-1'],
  } as RemoveConfirmedPackageDemandLineRequestDto;
  const user = { id: 'user-1', tenantId: 'tenant-1' } as AuthUser;

  it('dispatches tenant context and returns the confirmed-rental mutation response', async () => {
    const updatedAt = new Date('2030-01-01T10:00:00.000Z');
    const commandBus = {
      execute: jest.fn().mockResolvedValue(ok({ rentalId: 'rental-1', version: 8, updatedAt })),
    } as unknown as CommandBus;
    const controller = new RemoveConfirmedPackageDemandLineHttpController(commandBus);

    await expect(controller.remove(params, dto, user)).resolves.toEqual({
      id: 'rental-1',
      version: 8,
      updatedAt: updatedAt.toISOString(),
    });
    expect(commandBus.execute).toHaveBeenCalledWith(
      new RemoveConfirmedPackageDemandLineCommand({
        tenantId: 'tenant-1',
        tenantUserId: 'user-1',
        rentalId: 'rental-1',
        demandLineId: 'demand-line-1',
        expectedVersion: 7,
        quantity: 1,
        releaseAssetIds: ['asset-1'],
      }),
    );
  });

  it.each([
    'rental_commitment.demand_line_not_part_of_package',
    'rental_commitment.package_must_retain_demand_line',
    'rental_commitment.invalid_package_demand_line_removal_quantity',
    'rental_commitment.release_asset_count_mismatch',
    'rental_commitment.duplicate_release_asset_ids',
    'rental_commitment.release_asset_demand_line_mismatch',
  ] as const)('maps %s to unprocessable entity Problem Details', async (code) => {
    const applicationError = removeConfirmedPackageDemandLineError(code, 'ignored');
    const commandBus = { execute: jest.fn().mockResolvedValue(err(applicationError)) } as unknown as CommandBus;
    const controller = new RemoveConfirmedPackageDemandLineHttpController(commandBus);

    try {
      await controller.remove(params, dto, user);
      throw new Error('Expected controller to throw');
    } catch (error) {
      const problem = error as ProblemException;
      expect(problem.getStatus()).toBe(422);
      expect(problem.getProblemDetails()).toMatchObject({ code });
    }
  });

  it('maps an accessory reference to conflict Problem Details', async () => {
    const applicationError = removeConfirmedPackageDemandLineError(
      'rental_commitment.rental_demand_line_referenced_by_accessory',
      'ignored',
    );
    const commandBus = { execute: jest.fn().mockResolvedValue(err(applicationError)) } as unknown as CommandBus;
    const controller = new RemoveConfirmedPackageDemandLineHttpController(commandBus);

    try {
      await controller.remove(params, dto, user);
      throw new Error('Expected controller to throw');
    } catch (error) {
      const problem = error as ProblemException;
      expect(problem.getStatus()).toBe(409);
      expect(problem.getProblemDetails()).toMatchObject({
        code: 'rental_commitment.rental_demand_line_referenced_by_accessory',
      });
    }
  });
});
