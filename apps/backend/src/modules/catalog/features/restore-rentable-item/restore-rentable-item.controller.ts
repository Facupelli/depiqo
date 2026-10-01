import { TenantPermission } from '@repo/api-contracts';

import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { RestoreRentableItemCommand } from './restore-rentable-item.command';
import { RestoreRentableItemError, RestoreRentableItemErrorCode } from './restore-rentable-item.errors';
import { RestoreRentableItemRequestDto } from './restore-rentable-item.request.dto';

@Controller('catalog/rentable-items')
export class RestoreRentableItemHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':rentableItemId/restore')
  @RequirePermission(TenantPermission.ProductsManage)
  @HttpCode(HttpStatus.NO_CONTENT)
  async restoreRentableItem(
    @Param() params: RestoreRentableItemRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<RestoreRentableItemCommand, Result<void, RestoreRentableItemError>>(
      new RestoreRentableItemCommand(user.tenantId, params.rentableItemId),
    );

    if (result.isErr()) throw toRestoreRentableItemProblem(result.error);
  }
}

function toRestoreRentableItemProblem(error: RestoreRentableItemError): ProblemException {
  const problem = restoreRentableItemProblemMap[error.code];

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

const restoreRentableItemProblemMap = {
  'catalog.rentable_item_not_found': {
    type: createProblemType('catalog.rentable_item_not_found'),
    title: 'Rentable item not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rentable item could not be found.',
  },
} satisfies Record<RestoreRentableItemErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
