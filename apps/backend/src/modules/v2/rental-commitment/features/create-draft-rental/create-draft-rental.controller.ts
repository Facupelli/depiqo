import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/v2/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/v2/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/v2/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/v2/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/v2/tenant-management/auth/shared/session/tenant-user-session.guard';

import { CreateDraftRentalCommand } from './create-draft-rental.command';
import { CreateDraftRentalRequestDto } from './create-draft-rental.request.dto';
import { CreateDraftRentalResponseDto } from './create-draft-rental.response.dto';
import { CreateDraftRentalServiceResult } from './create-draft-rental.service';
import { rentalCommitmentApplicationError } from '../create-confirmed-rental/rental-commitment-application.error';
import { toRentalCommitmentProblem } from '../create-confirmed-rental/rental-commitment-http-error.mapper';
import { FulfillmentMethod } from '../../domain/rental-status';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';

@Controller('v2/rental-commitments/draft-rentals')
export class CreateDraftRentalHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async create(
    @Body() dto: CreateDraftRentalRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateDraftRentalResponseDto> {
    let period: RentalPeriod;

    try {
      period = new RentalPeriod(dto.period.start, dto.period.end);
    } catch (error) {
      throw toRentalCommitmentProblem(
        rentalCommitmentApplicationError('InvalidRentalPeriod', 'Invalid rental period.', error),
      );
    }

    const result = await this.commandBus.execute<CreateDraftRentalCommand, CreateDraftRentalServiceResult>(
      new CreateDraftRentalCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        branchId: dto.branchId,
        rentalCustomerId: dto.rentalCustomerId,
        period,
        selectedOffers: dto.selectedOffers,
        fulfillmentMethod: dto.fulfillmentMethod as FulfillmentMethod,
        deliveryDetails: dto.fulfillmentMethod === 'DELIVERY' ? dto.deliveryDetails : undefined,
        notes: dto.notes,
        insuranceSelected: dto.insuranceSelected,
        manualPricingAdjustment: dto.manualPricingAdjustment,
      }),
    );

    if (result.isErr()) {
      throw toRentalCommitmentProblem(result.error);
    }

    return { id: result.value.rentalId };
  }
}
