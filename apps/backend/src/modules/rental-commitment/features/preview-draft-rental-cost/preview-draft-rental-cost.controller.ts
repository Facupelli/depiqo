import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';
import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';

import { PreviewDraftRentalCostError } from './preview-draft-rental-cost.errors';
import { PreviewDraftRentalCostResult } from './preview-draft-rental-cost.handler';
import { PreviewDraftRentalCostQuery } from './preview-draft-rental-cost.query';
import { PreviewDraftRentalCostRequestDto } from './preview-draft-rental-cost.request.dto';
import { PreviewDraftRentalCostResponseDto } from './preview-draft-rental-cost.response.dto';

@Controller('rental-commitments/draft-rentals')
export class PreviewDraftRentalCostHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Post('preview-cost')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(TenantPermission.RentalsProposalsManage)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async preview(
    @Body() dto: PreviewDraftRentalCostRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PreviewDraftRentalCostResponseDto> {
    // This permission allows proposing prices, not applying adjustments or authorizing delivery.
    // Final mutations enforce the additional permissions on actual decisions.
    const result = await this.queryBus.execute<PreviewDraftRentalCostQuery, PreviewDraftRentalCostResult>(
      new PreviewDraftRentalCostQuery({
        tenantId: user.tenantId,
        rentalId: dto.rentalId,
        branchId: dto.branchId,
        rentalCustomerId: dto.rentalCustomerId,
        period: dto.period,
        selectedOffers: dto.selectedOffers,
        targetTotalAdjustment: dto.targetTotalAdjustment,
        insuranceSelected: dto.insuranceSelected,
        fulfillmentMethod: dto.fulfillmentMethod,
        deliveryIntent: dto.deliveryIntent,
        deliveryDecisions: dto.deliveryDecisions,
      }),
    );
    if (result.isErr()) {
      const error = result.error;
      const [status, title] = problems[error.code];
      throw ProblemException.from({
        problemDetails: createProblemDetails({
          type: createProblemType(error.code),
          title,
          status,
          detail: title,
          extensions: { code: error.code },
        }),
        applicationError: error,
        cause: error.cause,
      });
    }
    return PreviewDraftRentalCostResponseDto.schema.parse(result.value);
  }
}

const problems: Record<PreviewDraftRentalCostError['code'], [HttpStatus, string]> = {
  'rental_commitment.rental_not_found': [HttpStatus.NOT_FOUND, 'Rental not found'],
  'rental_commitment.rental_not_draft': [HttpStatus.CONFLICT, 'Rental is not a draft'],
  'rental_commitment.preview_invalid_input': [HttpStatus.UNPROCESSABLE_ENTITY, 'Invalid rental proposal'],
  'rental_commitment.delivery_review_required': [
    HttpStatus.CONFLICT,
    'Staff-arranged delivery changes require review and are not yet supported',
  ],
  'rental_commitment.preview_selection_unavailable': [HttpStatus.UNPROCESSABLE_ENTITY, 'Rental selection unavailable'],
  'rental_commitment.preview_configuration_unavailable': [
    HttpStatus.SERVICE_UNAVAILABLE,
    'Rental configuration unavailable',
  ],
  'rental_commitment.preview_pricing_unavailable': [HttpStatus.UNPROCESSABLE_ENTITY, 'Rental pricing unavailable'],
};
