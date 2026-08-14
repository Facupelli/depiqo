import { Body, Controller, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { UpdateRentableItemDefinitionCommand } from './update-rentable-item-definition.command';
import {
  UpdateRentableItemDefinitionError,
  UpdateRentableItemDefinitionErrorCode,
} from './update-rentable-item-definition.errors';
import {
  UpdateRentableItemDefinitionBodyDto,
  UpdateRentableItemDefinitionParamsDto,
} from './update-rentable-item-definition.request.dto';

@Controller('catalog/rentable-items')
export class UpdateRentableItemDefinitionHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':rentableItemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param() params: UpdateRentableItemDefinitionParamsDto,
    @Body() body: UpdateRentableItemDefinitionBodyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<
      UpdateRentableItemDefinitionCommand,
      Result<void, UpdateRentableItemDefinitionError>
    >(new UpdateRentableItemDefinitionCommand(user.tenantId, params.rentableItemId, body));

    if (result.isErr()) {
      throw toUpdateRentableItemDefinitionProblem(result.error);
    }
  }
}

function toUpdateRentableItemDefinitionProblem(error: UpdateRentableItemDefinitionError): ProblemException {
  const problem = updateRentableItemDefinitionProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const updateRentableItemDefinitionProblemMap = {
  'catalog.rentable_item_not_found': {
    type: createProblemType('catalog.rentable_item_not_found'),
    title: 'Rentable item not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rentable item could not be found.',
  },
  'catalog.rentable_item_archived': {
    type: createProblemType('catalog.rentable_item_archived'),
    title: 'Rentable item is archived',
    status: HttpStatus.CONFLICT,
    detail: 'Archived rentable items cannot be updated.',
  },
  'catalog.rentable_item_invalid_definition': {
    type: createProblemType('catalog.rentable_item_invalid_definition'),
    title: 'Invalid rentable item definition',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rentable item definition is invalid.',
  },
  'catalog.category_inactive': {
    type: createProblemType('catalog.category_inactive'),
    title: 'Category inactive',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Inactive categories cannot be assigned.',
  },
  'catalog.category_not_found': {
    type: createProblemType('catalog.category_not_found'),
    title: 'Category not found',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The selected category could not be found.',
  },
  'catalog.equipment_type_not_found': {
    type: createProblemType('catalog.equipment_type_not_found'),
    title: 'Equipment type not found',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'A referenced equipment type could not be found.',
  },
} satisfies Record<
  UpdateRentableItemDefinitionErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
