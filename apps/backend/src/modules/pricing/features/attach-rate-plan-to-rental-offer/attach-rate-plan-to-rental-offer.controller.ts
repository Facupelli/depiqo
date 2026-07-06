import { Body, Controller, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { AttachRatePlanToRentalOfferApplicationError } from './attach-rate-plan-to-rental-offer-application.error';
import { AttachRatePlanToRentalOfferCommand } from './attach-rate-plan-to-rental-offer.command';
import { toAttachRatePlanToRentalOfferProblem } from './attach-rate-plan-to-rental-offer-http-error.mapper';
import { AttachRatePlanToRentalOfferResult } from './attach-rate-plan-to-rental-offer.handler';
import { AttachRatePlanToRentalOfferRequestDto } from './attach-rate-plan-to-rental-offer.request.dto';
import { AttachRatePlanToRentalOfferResponseDto } from './attach-rate-plan-to-rental-offer.response.dto';

@Controller('pricing/rental-offer-pricings')
export class AttachRatePlanToRentalOfferHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put()
  @HttpCode(HttpStatus.OK)
  async attachRatePlanToRentalOffer(
    @Body() dto: AttachRatePlanToRentalOfferRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AttachRatePlanToRentalOfferResponseDto> {
    const result = await this.commandBus.execute<
      AttachRatePlanToRentalOfferCommand,
      Result<AttachRatePlanToRentalOfferResult, AttachRatePlanToRentalOfferApplicationError>
    >(
      new AttachRatePlanToRentalOfferCommand({
        tenantId: user.tenantId,
        catalogRentalOfferId: dto.catalogRentalOfferId,
        ratePlanId: dto.ratePlanId,
      }),
    );

    if (result.isErr()) {
      throw toAttachRatePlanToRentalOfferProblem(result.error);
    }

    return result.value;
  }
}
