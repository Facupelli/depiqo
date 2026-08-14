import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CreateRentableEquipmentCommand } from './create-rentable-equipment.command';
import { CreateRentableEquipmentError, CreateRentableEquipmentErrorCode } from './create-rentable-equipment.errors';
import { CreateRentableEquipmentServiceResult } from './create-rentable-equipment.handler';
import { CreateRentableEquipmentRequestDto } from './create-rentable-equipment.request.dto';
import { CreateRentableEquipmentResponseDto } from './create-rentable-equipment.response.dto';

@Controller('offering-setup/rentable-equipment')
export class CreateRentableEquipmentHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateRentableEquipmentRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateRentableEquipmentResponseDto> {
    const result = await this.commandBus.execute<CreateRentableEquipmentCommand, CreateRentableEquipmentServiceResult>(
      new CreateRentableEquipmentCommand({
        tenantId: user.tenantId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        categoryId: dto.categoryId,
        kind: dto.kind,
        quantityPerItem: dto.quantityPerItem,
        assets: dto.assets,
      }),
    );
    if (result.isErr()) throw toCreateRentableEquipmentProblem(result.error);
    return result.value;
  }
}

function toCreateRentableEquipmentProblem(error: CreateRentableEquipmentError): ProblemException {
  const problem = createrentableequipmentProblemMap[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: { code: error.code, ...error.context },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const createrentableequipmentProblemMap = {
  'offering_setup.tenant_unavailable': {
    type: createProblemType('offering_setup.tenant_unavailable'),
    title: 'Tenant unavailable',
    status: HttpStatus.NOT_FOUND,
    detail: 'The tenant is not available.',
  },
  'offering_setup.branch_unavailable': {
    type: createProblemType('offering_setup.branch_unavailable'),
    title: 'Branch unavailable',
    status: HttpStatus.NOT_FOUND,
    detail: 'One or more selected branches are not available.',
  },
  'offering_setup.invalid_equipment': {
    type: createProblemType('offering_setup.invalid_equipment'),
    title: 'Invalid equipment',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The equipment configuration is invalid.',
  },
  'offering_setup.duplicate_equipment_type_name': {
    type: createProblemType('offering_setup.duplicate_equipment_type_name'),
    title: 'Equipment type already exists',
    status: HttpStatus.CONFLICT,
    detail: 'An equipment type with this name already exists.',
  },
  'offering_setup.asset_owner_not_found': {
    type: createProblemType('offering_setup.asset_owner_not_found'),
    title: 'Asset owner not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'One or more asset owners were not found.',
  },
  'offering_setup.active_owner_contract_not_found': {
    type: createProblemType('offering_setup.active_owner_contract_not_found'),
    title: 'Active owner contract not found',
    status: HttpStatus.CONFLICT,
    detail: 'An asset owner does not have an active contract.',
  },
  'offering_setup.multiple_active_owner_contracts': {
    type: createProblemType('offering_setup.multiple_active_owner_contracts'),
    title: 'Multiple active owner contracts',
    status: HttpStatus.CONFLICT,
    detail: 'An asset owner has multiple active contracts.',
  },
  'offering_setup.invalid_rentable_item': {
    type: createProblemType('offering_setup.invalid_rentable_item'),
    title: 'Invalid rentable item',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rentable item configuration is invalid.',
  },
} satisfies Record<
  CreateRentableEquipmentErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
