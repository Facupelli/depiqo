import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/v2/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/v2/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/v2/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/v2/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/v2/tenant-management/auth/shared/session/tenant-user-session.guard';

import { CalculateDraftRentalPriceApplicationError } from './calculate-draft-rental-price-application.error';
import { CalculateDraftRentalPriceResult } from './calculate-draft-rental-price.handler';
import { toCalculateDraftRentalPriceProblem } from './calculate-draft-rental-price-http-error.mapper';
import { CalculateDraftRentalPriceQuery } from './calculate-draft-rental-price.query';
import { CalculateDraftRentalPriceRequestDto } from './calculate-draft-rental-price.request.dto';
import { CalculateDraftRentalPriceResponseDto } from './calculate-draft-rental-price.response.dto';

@Controller('v2/pricing/draft-rentals')
export class CalculateDraftRentalPriceHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Post('price')
  @HttpCode(HttpStatus.OK)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async calculateDraftRentalPrice(
    @Body() dto: CalculateDraftRentalPriceRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CalculateDraftRentalPriceResponseDto> {
    const result = await this.queryBus.execute<
      CalculateDraftRentalPriceQuery,
      Result<CalculateDraftRentalPriceResult, CalculateDraftRentalPriceApplicationError>
    >(
      new CalculateDraftRentalPriceQuery(
        user.tenantId,
        user.id,
        dto.branchId,
        dto.period.start,
        dto.period.end,
        dto.selectedOffers,
        dto.manualPricingAdjustment,
        dto.rentalCustomerId,
      ),
    );

    if (result.isErr()) {
      throw toCalculateDraftRentalPriceProblem(result.error);
    }

    return result.value;
  }
}
