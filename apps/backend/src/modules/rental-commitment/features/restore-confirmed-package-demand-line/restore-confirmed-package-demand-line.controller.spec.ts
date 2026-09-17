import { CommandBus } from '@nestjs/cqrs';
import { err, ok } from 'neverthrow';

import { ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { RestoreConfirmedPackageDemandLineCommand } from './restore-confirmed-package-demand-line.command';
import { RestoreConfirmedPackageDemandLineHttpController } from './restore-confirmed-package-demand-line.controller';
import { restoreConfirmedPackageDemandLineError } from './restore-confirmed-package-demand-line.errors';
import {
  RestoreConfirmedPackageDemandLineParamsDto,
  RestoreConfirmedPackageDemandLineRequestDto,
} from './restore-confirmed-package-demand-line.request.dto';

describe('RestoreConfirmedPackageDemandLineHttpController', () => {
  const params = {
    rentalId: 'rental-1',
    demandLineId: 'demand-line-1',
  } as RestoreConfirmedPackageDemandLineParamsDto;
  const dto = { expectedVersion: 7, quantity: 1 } as RestoreConfirmedPackageDemandLineRequestDto;
  const user = { id: 'user-1', tenantId: 'tenant-1' } as AuthUser;

  it('dispatches tenant context and returns the confirmed-rental mutation response', async () => {
    const updatedAt = new Date('2030-01-01T10:00:00.000Z');
    const commandBus = {
      execute: jest.fn().mockResolvedValue(ok({ rentalId: 'rental-1', version: 8, updatedAt })),
    } as CommandBus;
    const controller = new RestoreConfirmedPackageDemandLineHttpController(commandBus);

    await expect(controller.restore(params, dto, user)).resolves.toEqual({
      id: 'rental-1',
      version: 8,
      updatedAt: updatedAt.toISOString(),
    });
    expect(commandBus.execute).toHaveBeenCalledWith(
      new RestoreConfirmedPackageDemandLineCommand({
        tenantId: 'tenant-1',
        tenantUserId: 'user-1',
        rentalId: 'rental-1',
        demandLineId: 'demand-line-1',
        expectedVersion: 7,
        quantity: 1,
      }),
    );
  });

  it('maps an already-current demand line to conflict Problem Details', async () => {
    const applicationError = restoreConfirmedPackageDemandLineError(
      'rental_commitment.rental_demand_line_already_current',
      'ignored',
    );
    const commandBus = { execute: jest.fn().mockResolvedValue(err(applicationError)) } as CommandBus;
    const controller = new RestoreConfirmedPackageDemandLineHttpController(commandBus);

    try {
      await controller.restore(params, dto, user);
    } catch (error) {
      const problem = error as ProblemException;
      expect(problem.getStatus()).toBe(409);
      expect(problem.getProblemDetails()).toMatchObject({
        code: 'rental_commitment.rental_demand_line_already_current',
      });
    }
  });
});
