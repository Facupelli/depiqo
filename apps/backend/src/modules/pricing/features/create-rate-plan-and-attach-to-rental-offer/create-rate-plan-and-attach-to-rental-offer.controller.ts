import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { CreateRatePlanAndAttachToRentalOfferApplicationError } from './create-rate-plan-and-attach-to-rental-offer-application.error';
import { CreateRatePlanAndAttachToRentalOfferCommand } from './create-rate-plan-and-attach-to-rental-offer.command';
import { toCreateRatePlanAndAttachToRentalOfferProblem } from './create-rate-plan-and-attach-to-rental-offer-http-error.mapper';
import { CreateRatePlanAndAttachToRentalOfferResult } from './create-rate-plan-and-attach-to-rental-offer.handler';
import { CreateRatePlanAndAttachToRentalOfferRequestDto } from './create-rate-plan-and-attach-to-rental-offer.request.dto';
import { CreateRatePlanAndAttachToRentalOfferResponseDto } from './create-rate-plan-and-attach-to-rental-offer.response.dto';

@Controller('pricing/rental-offer-pricings')
export class CreateRatePlanAndAttachToRentalOfferHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('create-rate-plan')
  @HttpCode(HttpStatus.CREATED)
  async createRatePlanAndAttachToRentalOffer(
    @Body() dto: CreateRatePlanAndAttachToRentalOfferRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateRatePlanAndAttachToRentalOfferResponseDto> {
    const result = await this.commandBus.execute<
      CreateRatePlanAndAttachToRentalOfferCommand,
      Result<CreateRatePlanAndAttachToRentalOfferResult, CreateRatePlanAndAttachToRentalOfferApplicationError>
    >(
      new CreateRatePlanAndAttachToRentalOfferCommand({
        tenantId: user.tenantId,
        catalogRentalOfferId: dto.catalogRentalOfferId,
        name: dto.name,
        billingUnit: dto.billingUnit,
        currency: dto.currency,
        tiers: dto.tiers.map((tier) => ({
          fromUnit: tier.fromUnit,
          toUnit: tier.toUnit,
          pricePerUnit: tier.pricePerUnit,
        })),
      }),
    );

    if (result.isErr()) {
      throw toCreateRatePlanAndAttachToRentalOfferProblem(result.error);
    }

    return result.value;
  }
}
