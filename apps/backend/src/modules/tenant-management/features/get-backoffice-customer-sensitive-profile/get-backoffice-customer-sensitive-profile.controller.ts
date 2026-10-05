import { TenantPermission, type GetBackofficeCustomerSensitiveProfileResponseDto } from '@repo/api-contracts';
import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { RequireAllPermissions } from '../../authorization/tenant-authorization.decorators';
import { GetBackofficeCustomerSensitiveProfileHandler } from './get-backoffice-customer-sensitive-profile.handler';
import { GetBackofficeCustomerSensitiveProfileQuery } from './get-backoffice-customer-sensitive-profile.query';
import { GetBackofficeCustomerSensitiveProfileParamsDto } from './get-backoffice-customer-sensitive-profile.request.dto';

@Controller('tenant-management/rental-customers')
export class GetBackofficeCustomerSensitiveProfileHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':customerId/backoffice-sensitive-profile')
  @RequireAllPermissions(TenantPermission.CustomersRead, TenantPermission.CustomersSensitiveRead)
  async getProfile(
    @Param() params: GetBackofficeCustomerSensitiveProfileParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetBackofficeCustomerSensitiveProfileResponseDto> {
    const result = await this.queryBus.execute<
      GetBackofficeCustomerSensitiveProfileQuery,
      Awaited<ReturnType<GetBackofficeCustomerSensitiveProfileHandler['execute']>>
    >(new GetBackofficeCustomerSensitiveProfileQuery(user.tenantId, params.customerId));

    if (!result) {
      throw ProblemException.from({
        problemDetails: createProblemDetails({
          type: createProblemType('tenant-management/rental-customer-not-found'),
          title: 'Rental customer not found',
          status: HttpStatus.NOT_FOUND,
          detail: 'The requested rental customer was not found.',
          extensions: { code: 'tenant_management.rental_customer_not_found' },
        }),
      });
    }
    return result;
  }
}
