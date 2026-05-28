import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { Public } from 'src/core/decorators/public.decorator';
import { SkipCsrf } from 'src/modules/v2/tenant-management/auth/shared/csrf/skip-csrf.decorator';
import { CurrentStorefrontTenant } from '../../../tenant-management/tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContextGuard } from '../../../tenant-management/tenant-context/guards/storefront-tenant-context.guard';
import { StorefrontTenantContext } from '../../../tenant-management/tenant-context/tenant-context.contract';
import { rentalCommitmentApplicationError } from '../create-confirmed-rental/rental-commitment-application.error';
import { toRentalCommitmentProblem } from '../create-confirmed-rental/rental-commitment-http-error.mapper';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { GetStorefrontRentalOfferAvailabilityQuery } from './get-storefront-rental-offer-availability.query';
import { GetStorefrontRentalOfferAvailabilityResult } from './get-storefront-rental-offer-availability.handler';
import { GetStorefrontRentalOfferAvailabilityRequestDto } from './get-storefront-rental-offer-availability.request.dto';
import type { GetStorefrontRentalOfferAvailabilityResponseDto } from './get-storefront-rental-offer-availability.response.dto';

@Public()
@SkipCsrf()
@Controller('storefront/rental-commitment/rental-offers/availability')
@UseGuards(StorefrontTenantContextGuard)
export class GetStorefrontRentalOfferAvailabilityHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async getAvailability(
    @Body() dto: GetStorefrontRentalOfferAvailabilityRequestDto,
    @CurrentStorefrontTenant() tenant: StorefrontTenantContext,
  ): Promise<GetStorefrontRentalOfferAvailabilityResponseDto> {
    let period: RentalPeriod;

    try {
      period = new RentalPeriod(dto.periodStart, dto.periodEnd);
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
