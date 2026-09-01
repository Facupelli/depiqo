import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { Public } from 'src/core/decorators/public.decorator';
import { SkipCsrf } from 'src/modules/tenant-management/auth/shared/csrf/skip-csrf.decorator';

import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { BranchFacts } from '../../../tenant-management/public-api/branch-facts.public-api';
import { CurrentStorefrontTenant } from '../../../tenant-management/tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContextGuard } from '../../../tenant-management/tenant-context/guards/storefront-tenant-context.guard';
import { StorefrontTenantContext } from '../../../tenant-management/tenant-context/tenant-context.contract';
import { rentalCommitmentApplicationError } from '../create-confirmed-rental/rental-commitment-application.error';
import { toRentalCommitmentProblem } from '../create-confirmed-rental/rental-commitment-http-error.mapper';
import {
  GetStorefrontRentalOfferAvailabilityError,
  GetStorefrontRentalOfferAvailabilityErrorCode,
} from './get-storefront-rental-offer-availability.errors';
import { GetStorefrontRentalOfferAvailabilityResult } from './get-storefront-rental-offer-availability.handler';
import { GetStorefrontRentalOfferAvailabilityQuery } from './get-storefront-rental-offer-availability.query';
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
      period = new RentalPeriod(dto.periodStart, dto.periodEnd);
    } catch (error) {
      throw toRentalCommitmentProblem(
        rentalCommitmentApplicationError('InvalidRentalPeriod', 'Invalid rental period.', error),
      );
    }

    const result = await this.queryBus.execute<
      GetStorefrontRentalOfferAvailabilityQuery,
      GetStorefrontRentalOfferAvailabilityResult
    >(new GetStorefrontRentalOfferAvailabilityQuery(tenant.tenantId, dto.branchId, period, dto.rentalOfferIds));

    if (result.isErr()) {
      throw toGetStorefrontRentalOfferAvailabilityProblem(result.error);
    }

    return result.value;
  }
}

function toGetStorefrontRentalOfferAvailabilityProblem(
  error: GetStorefrontRentalOfferAvailabilityError,
): ProblemException {
  const definition = storefrontAvailabilityProblemMap[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...definition,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const storefrontAvailabilityProblemMap = {
  'rental_commitment.invalid_fulfillment_definition': {
    type: createProblemType('rental-commitment/invalid-fulfillment-definition'),
    title: 'Invalid fulfillment definition',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental offer has an invalid fulfillment definition.',
  },
  'rental_commitment.invalid_candidate_projection': {
    type: createProblemType('rental_commitment.invalid_candidate_projection'),
    title: 'Invalid candidate projection',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Availability could not be determined from the current asset candidate projection.',
  },
  'rental_commitment.tenant_unavailable': {
    type: createProblemType('rental_commitment.tenant_unavailable'),
    title: 'Tenant unavailable',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The tenant is not available for rental availability.',
  },
} satisfies Record<
  GetStorefrontRentalOfferAvailabilityErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
