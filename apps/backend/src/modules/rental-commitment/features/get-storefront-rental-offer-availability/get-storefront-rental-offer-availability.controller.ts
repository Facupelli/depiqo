import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { Public } from 'src/core/decorators/public.decorator';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { SkipCsrf } from 'src/modules/tenant-management/auth/shared/csrf/skip-csrf.decorator';

import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { BranchFacts } from '../../../tenant-management/public-api/branch-facts.public-api';
import { CurrentStorefrontTenant } from '../../../tenant-management/tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContextGuard } from '../../../tenant-management/tenant-context/guards/storefront-tenant-context.guard';
import { StorefrontTenantContext } from '../../../tenant-management/tenant-context/tenant-context.contract';
import { rentalCommitmentApplicationError } from '../create-confirmed-rental/rental-commitment-application.error';
import { toRentalCommitmentProblem } from '../create-confirmed-rental/rental-commitment-http-error.mapper';
import { GetStorefrontRentalOfferAvailabilityQuery } from './get-storefront-rental-offer-availability.query';
import { GetStorefrontRentalOfferAvailabilityResult } from './get-storefront-rental-offer-availability.handler';
import { GetStorefrontRentalOfferAvailabilityRequestDto } from './get-storefront-rental-offer-availability.request.dto';
import type { GetStorefrontRentalOfferAvailabilityResponseDto } from './get-storefront-rental-offer-availability.response.dto';

@Public()
@SkipCsrf()
@Controller('storefront/rental-commitment/rental-offers/availability')
@UseGuards(StorefrontTenantContextGuard)
export class GetStorefrontRentalOfferAvailabilityHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly tenantManagementApi: BranchFacts,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async getAvailability(
    @Body() dto: GetStorefrontRentalOfferAvailabilityRequestDto,
    @CurrentStorefrontTenant() tenant: StorefrontTenantContext,
  ): Promise<GetStorefrontRentalOfferAvailabilityResponseDto> {
    const branchContext = await this.tenantManagementApi.getBranchFacts({
      tenantId: tenant.tenantId,
      branchId: dto.branchId,
    });

    if (branchContext.isErr()) {
      throw toRentalCommitmentProblem(
        rentalCommitmentApplicationError(
          branchContext.error.code === 'BranchNotFound' ? 'BranchUnavailableForRental' : 'TenantUnavailableForRental',
          branchContext.error.message,
          branchContext.error,
        ),
      );
    }

    let period: RentalPeriod;

    try {
      const dateRange = DateRange.fromInclusiveLocalDateKeys(
        dto.periodStart,
        dto.periodEnd,
        branchContext.value.effectiveTimezone,
      );
      period = new RentalPeriod(dateRange.start, dateRange.end);
    } catch (error) {
      throw toRentalCommitmentProblem(
        rentalCommitmentApplicationError('InvalidRentalPeriod', 'Invalid rental period.', error),
      );
    }

    return this.queryBus.execute<GetStorefrontRentalOfferAvailabilityQuery, GetStorefrontRentalOfferAvailabilityResult>(
      new GetStorefrontRentalOfferAvailabilityQuery(tenant.tenantId, dto.branchId, period, dto.rentalOffers),
    );
  }
}
