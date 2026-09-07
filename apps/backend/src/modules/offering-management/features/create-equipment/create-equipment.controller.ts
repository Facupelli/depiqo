import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CreateEquipmentCommand } from './create-equipment.command';
import { CreateEquipmentError, CreateEquipmentErrorCode } from './create-equipment.errors';
import { CreateEquipmentServiceResult } from './create-equipment.handler';
import { CreateEquipmentRequestDto } from './create-equipment.request.dto';
import { CreateEquipmentResponseDto } from './create-equipment.response.dto';

@Controller('offering-setup/equipment')
export class CreateEquipmentHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateEquipmentRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateEquipmentResponseDto> {
    const result = await this.commandBus.execute<CreateEquipmentCommand, CreateEquipmentServiceResult>(
      new CreateEquipmentCommand({
        tenantId: user.tenantId,
        equipment: dto.equipment,
        assets: dto.assets,
        standaloneRental: dto.standaloneRental,
      }),
    );
    if (result.isErr()) throw toCreateEquipmentProblem(result.error);
    return result.value;
  }
}

function toCreateEquipmentProblem(error: CreateEquipmentError): ProblemException {
  const problem = createEquipmentProblemMap[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: { code: error.code, ...error.context },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const createEquipmentProblemMap = {
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
  'offering_setup.invalid_standalone_rental': {
    type: createProblemType('offering_setup.invalid_standalone_rental'),
    title: 'Invalid standalone rental',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The standalone rental configuration is invalid.',
  },
} satisfies Record<CreateEquipmentErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
