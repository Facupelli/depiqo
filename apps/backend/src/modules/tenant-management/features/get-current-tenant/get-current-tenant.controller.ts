import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { GetCurrentTenantResult } from './get-current-tenant.handler';
import { toGetCurrentTenantProblem } from './get-current-tenant-http-error.mapper';
import { GetCurrentTenantQuery } from './get-current-tenant.query';
import { GetCurrentTenantResponseDto } from './get-current-tenant.response.dto';

@Controller('tenant-management/tenant')
export class GetCurrentTenantHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<GetCurrentTenantResponseDto> {
    const result = await this.queryBus.execute<GetCurrentTenantQuery, GetCurrentTenantResult>(
      new GetCurrentTenantQuery(user.tenantId),
    );

    if (result.isErr()) {
      throw toGetCurrentTenantProblem(result.error);
    }

    return result.value;
  }
}
