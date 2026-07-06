import { Body, Controller, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { UpdatePromotionApplicationError } from './update-promotion-application.error';
import { UpdatePromotionCommand } from './update-promotion.command';
import { UpdatePromotionResult } from './update-promotion.handler';
import { toUpdatePromotionProblem } from './update-promotion-http-error.mapper';
import { UpdatePromotionParamsDto, UpdatePromotionRequestDto } from './update-promotion.request.dto';
import { UpdatePromotionResponseDto } from './update-promotion.response.dto';

@Controller('pricing/promotions')
export class UpdatePromotionHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(':promotionId')
  @HttpCode(HttpStatus.OK)
  async updatePromotion(
    @Param() params: UpdatePromotionParamsDto,
    @Body() dto: UpdatePromotionRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UpdatePromotionResponseDto> {
    const result = await this.commandBus.execute<
      UpdatePromotionCommand,
      Result<UpdatePromotionResult, UpdatePromotionApplicationError>
    >(
      new UpdatePromotionCommand({
        tenantId: user.tenantId,
        promotionId: params.promotionId,
        name: dto.name,
        activation: dto.activation,
        priority: dto.priority,
        stackable: dto.stackable,
        isActive: dto.isActive,
        validFrom: dto.validFrom,
        validUntil: dto.validUntil,
        effectType: dto.effectType,
        effectValue: dto.effectValue,
        target: dto.target,
        minOrderSubtotal: dto.minOrderSubtotal,
        minRentalUnits: dto.minRentalUnits,
        maxRentalUnits: dto.maxRentalUnits,
        scopes: dto.scopes,
        exclusions: dto.exclusions,
      }),
    );

    if (result.isErr()) {
      throw toUpdatePromotionProblem(result.error);
    }

    return result.value;
  }
}
