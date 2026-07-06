import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { GetCustomDomainResult } from './get-custom-domain.handler';
import { GetCustomDomainQuery } from './get-custom-domain.query';
import { GetCustomDomainResponseDto } from './get-custom-domain.response.dto';

@Controller('tenant-management/tenant/custom-domain')
export class GetCustomDomainHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getCustomDomain(@CurrentUser() user: AuthUser): Promise<GetCustomDomainResponseDto | null> {
    return this.queryBus.execute<GetCustomDomainQuery, GetCustomDomainResult>(new GetCustomDomainQuery(user.tenantId));
  }
}
