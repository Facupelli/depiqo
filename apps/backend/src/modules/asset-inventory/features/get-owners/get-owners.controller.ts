import { TenantPermission } from '@repo/api-contracts';
import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { RequireAnyPermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';
import { GetOwnersResult } from './get-owners.handler';
import { GetOwnersQuery } from './get-owners.query';
import type { GetOwnersResponseDto } from './get-owners.response.dto';

@Controller('asset-inventory/owners')
export class GetOwnersHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @RequireAnyPermission(
    TenantPermission.InventoryRead,
    TenantPermission.InventoryManage,
    TenantPermission.InventoryOwnershipManage,
  )
  @Get()
  async getOwners(@CurrentUser() user: AuthUser): Promise<GetOwnersResponseDto> {
    return this.queryBus.execute<GetOwnersQuery, GetOwnersResult>(new GetOwnersQuery(user.tenantId));
  }
}
