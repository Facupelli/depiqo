import { TenantPermission } from '@repo/api-contracts';
import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { RequirePermission } from '../../authorization/tenant-authorization.decorators';
import { GetBackofficeCustomerProfileResult } from './get-backoffice-customer-profile.handler';
import { GetBackofficeCustomerProfileQuery } from './get-backoffice-customer-profile.query';
import { GetBackofficeCustomerProfileParamsDto } from './get-backoffice-customer-profile.request.dto';
import { GetBackofficeCustomerProfileResponseDto } from './get-backoffice-customer-profile.response.dto';

@Controller('tenant-management/rental-customers')
export class GetBackofficeCustomerProfileHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':customerId/backoffice-profile')
  @RequirePermission(TenantPermission.CustomersRead)
  async getProfile(
    @Param() params: GetBackofficeCustomerProfileParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetBackofficeCustomerProfileResponseDto> {
    const result = await this.queryBus.execute<GetBackofficeCustomerProfileQuery, GetBackofficeCustomerProfileResult>(
      new GetBackofficeCustomerProfileQuery(user.tenantId, params.customerId),
    );

    if (result.isErr()) {
      throw ProblemException.from({
        problemDetails: createProblemDetails({
          type: createProblemType('tenant-management/rental-customer-not-found'),
          title: 'Rental customer not found',
          status: HttpStatus.NOT_FOUND,
          detail: 'The requested rental customer was not found.',
          extensions: { code: result.error.code },
        }),
        applicationError: result.error,
        cause: result.error.cause,
      });
    }

    return result.value;
  }
}
