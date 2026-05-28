import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { ActivateRentableItemApplicationError } from './activate-rentable-item-application.error';
import { ActivateRentableItemCommand } from './activate-rentable-item.command';
import { toActivateRentableItemProblem } from './activate-rentable-item-http-error.mapper';
import { ActivateRentableItemRequestDto } from './activate-rentable-item.request.dto';

@Controller('v2/catalog/rentable-items')
export class ActivateRentableItemHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':rentableItemId/activate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async activateRentableItem(
    @Param() params: ActivateRentableItemRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<
      ActivateRentableItemCommand,
      Result<void, ActivateRentableItemApplicationError>
    >(new ActivateRentableItemCommand(user.tenantId, params.rentableItemId));

    if (result.isErr()) {
      throw toActivateRentableItemProblem(result.error);
    }
  }
}
