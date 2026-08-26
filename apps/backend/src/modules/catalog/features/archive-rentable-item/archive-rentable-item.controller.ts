import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { ArchiveRentableItemCommand } from './archive-rentable-item.command';
import { ArchiveRentableItemError, ArchiveRentableItemErrorCode } from './archive-rentable-item.errors';
import { ArchiveRentableItemRequestDto } from './archive-rentable-item.request.dto';

@Controller('catalog/rentable-items')
export class ArchiveRentableItemHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':rentableItemId/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archiveRentableItem(
    @Param() params: ArchiveRentableItemRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<ArchiveRentableItemCommand, Result<void, ArchiveRentableItemError>>(
      new ArchiveRentableItemCommand(user.tenantId, params.rentableItemId),
    );

    if (result.isErr()) {
      throw toArchiveRentableItemProblem(result.error);
    }
  }
}

function toArchiveRentableItemProblem(error: ArchiveRentableItemError): ProblemException {
  const problem = archiveRentableItemProblemMap[error.code];

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

const archiveRentableItemProblemMap = {
  'catalog.rentable_item_not_found': {
    type: createProblemType('catalog.rentable_item_not_found'),
    title: 'Rentable item not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rentable item could not be found.',
  },
} satisfies Record<ArchiveRentableItemErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
