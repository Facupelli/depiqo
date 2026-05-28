import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { GetRentalCustomersResult } from './get-rental-customers.handler';
import { GetRentalCustomersQuery } from './get-rental-customers.query';
import { GetRentalCustomersRequestDto } from './get-rental-customers.request.dto';
import type { GetRentalCustomersResponseDto } from './get-rental-customers.response.dto';

@Controller('v2/tenant-management/rental-customers')
export class GetRentalCustomersHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getRentalCustomers(
    @Query() dto: GetRentalCustomersRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentalCustomersResponseDto> {
    return this.queryBus.execute<GetRentalCustomersQuery, GetRentalCustomersResult>(
      new GetRentalCustomersQuery(user.tenantId, dto.status, dto.search, dto.page, dto.pageSize),
    );
  }
}
