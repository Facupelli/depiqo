import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';
import { GetOwnersResult } from './get-owners.handler';
import { GetOwnersQuery } from './get-owners.query';
import type { GetOwnersResponseDto } from './get-owners.response.dto';

@Controller('v2/asset-inventory/owners')
export class GetOwnersHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getOwners(@CurrentUser() user: AuthenticatedUser): Promise<GetOwnersResponseDto> {
    return this.queryBus.execute<GetOwnersQuery, GetOwnersResult>(new GetOwnersQuery(user.tenantId));
  }
}
