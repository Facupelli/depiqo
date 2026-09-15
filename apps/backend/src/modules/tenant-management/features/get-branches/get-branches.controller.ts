import { TenantPermission } from '@repo/api-contracts';
import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { RequireAnyPermission } from '../../authorization/tenant-authorization.decorators';
import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { GetBranchesResult } from './get-branches.handler';
import { GetBranchesQuery } from './get-branches.query';
import { GetBranchesRequestDto } from './get-branches.request.dto';
import type { GetBranchesResponseDto } from './get-branches.response.dto';

@Controller('tenant-management/branches')
export class GetBranchesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequireAnyPermission(
    TenantPermission.BranchesManage,
    TenantPermission.RentalsRead,
    TenantPermission.RentalsProposalsManage,
    TenantPermission.RentalsConfirm,
    TenantPermission.RentalsConfirmedManage,
    TenantPermission.RentalsFulfillmentManage,
    TenantPermission.RentalsCancel,
    TenantPermission.RentalsPriceAdjustmentManage,
    TenantPermission.ContractsRead,
    TenantPermission.ContractsGenerate,
    TenantPermission.ContractsSigningSend,
    TenantPermission.ProductsRead,
    TenantPermission.ProductsManage,
    TenantPermission.ProductsAvailabilityManage,
    TenantPermission.InventoryRead,
    TenantPermission.InventoryManage,
    TenantPermission.InventoryOwnershipManage,
    TenantPermission.PricingRead,
    TenantPermission.PricingManage,
    TenantPermission.CustomersRead,
    TenantPermission.CustomersOnboardingManage,
    TenantPermission.TenantSettingsManage,
    TenantPermission.TenantStorefrontManage,
    TenantPermission.TenantContractSignerManage,
  )
  async getBranches(
    @Query() dto: GetBranchesRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetBranchesResponseDto> {
    return this.queryBus.execute<GetBranchesQuery, GetBranchesResult>(
      new GetBranchesQuery(user.tenantId, dto.isActive),
    );
  }
}
