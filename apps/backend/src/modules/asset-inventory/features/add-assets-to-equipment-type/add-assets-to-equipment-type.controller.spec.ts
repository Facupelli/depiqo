import { CommandBus } from '@nestjs/cqrs';
import { err, ok } from 'neverthrow';

import { ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { AddAssetsToEquipmentTypeHttpController } from './add-assets-to-equipment-type.controller';
import { addAssetsToEquipmentTypeError } from './add-assets-to-equipment-type.errors';
import {
  AddAssetsToEquipmentTypeParamsDto,
  AddAssetsToEquipmentTypeRequestDto,
} from './add-assets-to-equipment-type.request.dto';

function requestInput() {
  return {
    params: { equipmentTypeId: 'equipment-type-1' } as AddAssetsToEquipmentTypeParamsDto,
    dto: {
      assets: [{ branchId: 'branch-1', serialNumber: 'SERIAL-1' }],
    } as AddAssetsToEquipmentTypeRequestDto,
    user: { tenantId: 'tenant-1' } as AuthUser,
  };
}

describe('AddAssetsToEquipmentTypeHttpController', () => {
  it('returns the created asset ids', async () => {
    const commandBus = { execute: jest.fn().mockResolvedValue(ok({ assetIds: ['asset-1'] })) } as unknown as CommandBus;
    const controller = new AddAssetsToEquipmentTypeHttpController(commandBus);
    const input = requestInput();

    await expect(controller.create(input.params, input.dto, input.user)).resolves.toEqual({ assetIds: ['asset-1'] });
  });

  it('maps expected failures to Problem Details with the feature error and cause', async () => {
    const cause = new Error('equipment type not found');
    const applicationError = addAssetsToEquipmentTypeError(
      'asset_inventory.equipment_type_not_found',
      cause.message,
      cause,
      { equipmentTypeId: 'equipment-type-1' },
    );
    const commandBus = { execute: jest.fn().mockResolvedValue(err(applicationError)) } as unknown as CommandBus;
    const controller = new AddAssetsToEquipmentTypeHttpController(commandBus);
    const input = requestInput();

    try {
      await controller.create(input.params, input.dto, input.user);
      throw new Error('Expected controller to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ProblemException);
      const problem = error as ProblemException;
      expect(problem.getStatus()).toBe(404);
      expect(problem.getProblemDetails()).toMatchObject({
        type: expect.stringContaining('asset_inventory.equipment_type_not_found'),
        title: 'Equipment type not found',
        status: 404,
        code: 'asset_inventory.equipment_type_not_found',
        equipmentTypeId: 'equipment-type-1',
      });
      expect(problem.getApplicationError()).toEqual(applicationError);
      expect(problem.getCause()).toBe(cause);
    }
  });
});
