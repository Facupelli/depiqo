import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { ActivateRentableItemCommand } from './activate-rentable-item.command';
import { ActivateRentableItemError, ActivateRentableItemErrorCode } from './activate-rentable-item.errors';
import { ActivateRentableItemRequestDto } from './activate-rentable-item.request.dto';

@Controller('catalog/rentable-items')
export class ActivateRentableItemHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':rentableItemId/activate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async activateRentableItem(
    @Param() params: ActivateRentableItemRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<ActivateRentableItemCommand, Result<void, ActivateRentableItemError>>(
      new ActivateRentableItemCommand(user.tenantId, params.rentableItemId),
    );

    if (result.isErr()) {
      throw toActivateRentableItemProblem(result.error);
    }
  }
}

function toActivateRentableItemProblem(error: ActivateRentableItemError): ProblemException {
  const problem = activateRentableItemProblemMap[error.code];

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

const activateRentableItemProblemMap = {
  'catalog.rentable_item_not_found': {
    type: createProblemType('catalog.rentable_item_not_found'),
    title: 'Rentable item not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rentable item could not be found.',
  },
  'catalog.rentable_item_not_in_draft_status': {
    type: createProblemType('catalog.rentable_item_not_in_draft_status'),
    title: 'Rentable item is not in draft status',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Only draft rentable items can be activated.',
  },
  'catalog.rentable_item_has_no_requirements': {
    type: createProblemType('catalog.rentable_item_has_no_requirements'),
    title: 'Rentable item has no requirements',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rentable item must have at least one equipment requirement before it can be activated.',
  },
  'catalog.rentable_item_has_no_rental_offers': {
    type: createProblemType('catalog.rentable_item_has_no_rental_offers'),
    title: 'Rentable item has no rental offers',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rentable item must have at least one branch rental offer before it can be activated.',
  },
  'catalog.rentable_item_has_no_active_pricing': {
    type: createProblemType('catalog.rentable_item_has_no_active_pricing'),
    title: 'Rentable item has no active pricing',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'At least one rental offer must have active pricing before the rentable item can be activated.',
  },
} satisfies Record<ActivateRentableItemErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
