import { Body, Controller, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { UpdateEquipmentTypeCommand } from './update-equipment-type.command';
import { UpdateEquipmentTypeError, UpdateEquipmentTypeErrorCode } from './update-equipment-type.errors';
import { UpdateEquipmentTypeResult } from './update-equipment-type.handler';
import { UpdateEquipmentTypeParamsDto, UpdateEquipmentTypeRequestDto } from './update-equipment-type.request.dto';

@Controller('asset-inventory/equipment-types')
export class UpdateEquipmentTypeHttpController {
  constructor(private readonly commandBus: CommandBus) {}
  @Patch(':equipmentTypeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param() params: UpdateEquipmentTypeParamsDto,
    @Body() dto: UpdateEquipmentTypeRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<UpdateEquipmentTypeCommand, UpdateEquipmentTypeResult>(
      new UpdateEquipmentTypeCommand(user.tenantId, params.equipmentTypeId, dto.name, dto.description),
    );
    if (result.isErr()) throw toProblem(result.error);
  }
}
function toProblem(error: UpdateEquipmentTypeError): ProblemException {
  const problem = problems[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({ ...problem, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}
const problems = {
  'asset_inventory.equipment_type_not_found': {
    type: createProblemType('asset_inventory.equipment_type_not_found'),
    title: 'Equipment type not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested equipment type could not be found.',
  },
  'asset_inventory.invalid_equipment_type_field': {
    type: createProblemType('asset_inventory.invalid_equipment_type_field'),
    title: 'Invalid equipment type',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The equipment type metadata is invalid.',
  },
  'asset_inventory.duplicate_equipment_type_name': {
    type: createProblemType('asset_inventory.duplicate_equipment_type_name'),
    title: 'Duplicate equipment type name',
    status: HttpStatus.CONFLICT,
    detail: 'An equipment type with this name already exists.',
  },
} satisfies Record<UpdateEquipmentTypeErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
