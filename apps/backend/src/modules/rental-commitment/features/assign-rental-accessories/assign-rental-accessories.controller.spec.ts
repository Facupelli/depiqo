import { CommandBus } from '@nestjs/cqrs';
import { err } from 'neverthrow';

import { ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { AssignRentalAccessoriesHttpController } from './assign-rental-accessories.controller';
import { assignRentalAccessoriesError } from './assign-rental-accessories.errors';
import {
  AssignRentalAccessoriesParamsDto,
  AssignRentalAccessoriesRequestDto,
} from './assign-rental-accessories.request.dto';

function requestInput() {
  return {
    params: { rentalId: 'rental-1' } as AssignRentalAccessoriesParamsDto,
    dto: {
      accessories: [
        {
          sourceRentalDemandLineId: 'demand-line-1',
          equipmentTypeId: 'equipment-type-1',
          quantity: 4,
        },
      ],
    } as AssignRentalAccessoriesRequestDto,
    user: { tenantId: 'tenant-1' } as AuthUser,
  };
}

describe('AssignRentalAccessoriesHttpController', () => {
  it('maps a deterministic availability failure with its safe extension', async () => {
    const applicationError = assignRentalAccessoriesError(
      'rental_commitment.insufficient_asset_availability',
      'ignored',
      undefined,
      {
        availability: {
          sourceRentalDemandLineId: 'demand-line-1',
          equipmentTypeId: 'equipment-type-1',
          requestedQuantity: 4,
          availableQuantity: 3,
        },
      },
    );
    const commandBus = { execute: jest.fn().mockResolvedValue(err(applicationError)) } as unknown as CommandBus;
    const controller = new AssignRentalAccessoriesHttpController(commandBus);
    const input = requestInput();

    try {
      await controller.assignAccessories(input.params, input.dto, input.user);
      throw new Error('Expected controller to throw');
    } catch (error) {
      const problem = error as ProblemException;
      expect(problem.getStatus()).toBe(409);
      expect(problem.getProblemDetails()).toMatchObject({
        code: 'rental_commitment.insufficient_asset_availability',
        availability: applicationError.context?.availability,
      });
    }
  });

  it('does not attach a row extension for an availability race', async () => {
    const applicationError = assignRentalAccessoriesError('rental_commitment.asset_availability_changed', 'ignored');
    const commandBus = { execute: jest.fn().mockResolvedValue(err(applicationError)) } as unknown as CommandBus;
    const controller = new AssignRentalAccessoriesHttpController(commandBus);
    const input = requestInput();

    try {
      await controller.assignAccessories(input.params, input.dto, input.user);
      throw new Error('Expected controller to throw');
    } catch (error) {
      const problem = error as ProblemException;
      expect(problem.getStatus()).toBe(409);
      expect(problem.getProblemDetails()).toMatchObject({
        code: 'rental_commitment.asset_availability_changed',
      });
      expect(problem.getProblemDetails()).not.toHaveProperty('availability');
    }
  });
});
