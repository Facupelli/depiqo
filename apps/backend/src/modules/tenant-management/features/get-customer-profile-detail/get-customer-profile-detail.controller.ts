import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { GetCustomerProfileDetailResult } from './get-customer-profile-detail.handler';
import { toGetCustomerProfileDetailProblem } from './get-customer-profile-detail-http-error.mapper';
import { GetCustomerProfileDetailQuery } from './get-customer-profile-detail.query';
import { GetCustomerProfileDetailParamsDto } from './get-customer-profile-detail.request.dto';
import { GetCustomerProfileDetailResponseDto } from './get-customer-profile-detail.response.dto';

@Controller('v2/tenant-management/rental-customers')
export class GetCustomerProfileDetailHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':customerId/profile')
  async getCustomerProfileDetail(
    @Param() params: GetCustomerProfileDetailParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetCustomerProfileDetailResponseDto> {
    const result = await this.queryBus.execute<GetCustomerProfileDetailQuery, GetCustomerProfileDetailResult>(
      new GetCustomerProfileDetailQuery(user.tenantId, params.customerId),
    );

    if (result.isErr()) {
      throw toGetCustomerProfileDetailProblem(result.error);
    }

    return result.value;
  }
}
