import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CreateRentalOfferWithPricingCommand } from './create-rental-offer-with-pricing.command';
import { toCreateRentalOfferWithPricingProblem } from './create-rental-offer-with-pricing-http-error.mapper';
import { CreateRentalOfferWithPricingServiceResult } from './create-rental-offer-with-pricing.handler';
import { CreateRentalOfferWithPricingRequestDto } from './create-rental-offer-with-pricing.request.dto';
import { CreateRentalOfferWithPricingResponseDto } from './create-rental-offer-with-pricing.response.dto';

@Controller('v2/offering-setup/rental-offers')
export class CreateRentalOfferWithPricingHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateRentalOfferWithPricingRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateRentalOfferWithPricingResponseDto> {
    const result = await this.commandBus.execute<
      CreateRentalOfferWithPricingCommand,
      CreateRentalOfferWithPricingServiceResult
    >(
      new CreateRentalOfferWithPricingCommand({
        tenantId: user.tenantId,
        rentableItemId: dto.rentableItemId,
        branchId: dto.branchId,
        pricing: dto.pricing,
      }),
    );

    if (result.isErr()) {
      throw toCreateRentalOfferWithPricingProblem(result.error);
    }

    return {
      rentalOfferId: result.value.rentalOfferId,
      ratePlanId: result.value.ratePlanId,
      rentalOfferPricingId: result.value.rentalOfferPricingId,
    };
  }
}
