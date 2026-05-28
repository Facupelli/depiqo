import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { AUTH_ACTOR_TYPES, AuthCustomer } from 'src/modules/v2/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/v2/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/v2/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/v2/tenant-management/auth/shared/session/session-auth.guard';
import { TenantCustomerSessionGuard } from 'src/modules/v2/tenant-management/auth/shared/session/tenant-customer-session.guard';

import { CreateConfirmedRentalCommand } from './create-confirmed-rental.command';
import { CreateConfirmedRentalServiceResult } from './create-confirmed-rental.handler';
import { rentalCommitmentApplicationError } from './rental-commitment-application.error';
import { FulfillmentMethod } from '../../domain/rental-status';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { toRentalCommitmentProblem } from './rental-commitment-http-error.mapper';

import { CreateConfirmedRentalRequestDto } from './create-confirmed-rental.request.dto';
import { CreateConfirmedRentalResponseDto } from './create-confirmed-rental.response.dto';

@Controller('v2/rental-commitments/confirmed-rentals')
export class CreateConfirmedRentalHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_CUSTOMER)
  @UseGuards(SessionAuthGuard, TenantCustomerSessionGuard)
  async create(
    @Body() dto: CreateConfirmedRentalRequestDto,
    @CurrentUser() user: AuthCustomer,
  ): Promise<CreateConfirmedRentalResponseDto> {
    let period: RentalPeriod;

    try {
      period = new RentalPeriod(dto.period.start, dto.period.end);
    } catch (error) {
      throw toRentalCommitmentProblem(
        rentalCommitmentApplicationError('InvalidRentalPeriod', 'Invalid rental period.', error),
      );
    }

    const result = await this.commandBus.execute<CreateConfirmedRentalCommand, CreateConfirmedRentalServiceResult>(
      new CreateConfirmedRentalCommand({
        tenantId: user.tenantId,
        branchId: dto.branchId,
        rentalCustomerId: user.id,
        period,
        selectedOffers: dto.selectedOffers,
        fulfillmentMethod: dto.fulfillmentMethod as FulfillmentMethod,
        deliveryDetails: dto.fulfillmentMethod === 'DELIVERY' ? dto.deliveryDetails : undefined,
        notes: dto.notes,
        insuranceSelected: dto.insuranceSelected,
      }),
    );

    if (result.isErr()) {
      throw toRentalCommitmentProblem(result.error);
    }

    return { id: result.value.rentalId };
  }
}
