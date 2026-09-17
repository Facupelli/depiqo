import { TenantPermission } from '@repo/api-contracts';
import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { RequireAnyPermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { GetPromotionsResult } from './get-promotions.handler';
import { GetPromotionsQuery } from './get-promotions.query';
import { GetPromotionsRequestDto } from './get-promotions.request.dto';
import type { GetPromotionsResponseDto } from './get-promotions.response.dto';

@Controller('pricing/promotions')
export class GetPromotionsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequireAnyPermission(TenantPermission.PricingRead, TenantPermission.PricingManage)
  async getPromotions(
    @Query() dto: GetPromotionsRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetPromotionsResponseDto> {
    return this.queryBus.execute<GetPromotionsQuery, GetPromotionsResult>(
      new GetPromotionsQuery({
        tenantId: user.tenantId,
        isActive: dto.isActive,
        activation: dto.activation,
        effectType: dto.effectType,
        search: dto.search,
      }),
    );
  }
}
