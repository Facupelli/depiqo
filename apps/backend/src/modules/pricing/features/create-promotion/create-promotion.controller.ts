import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { CreatePromotionApplicationError } from './create-promotion-application.error';
import { CreatePromotionCommand } from './create-promotion.command';
import { toCreatePromotionProblem } from './create-promotion-http-error.mapper';
import { CreatePromotionResult } from './create-promotion.handler';
import { CreatePromotionRequestDto } from './create-promotion.request.dto';
import { CreatePromotionResponseDto } from './create-promotion.response.dto';

@Controller('v2/pricing/promotions')
export class CreatePromotionHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPromotion(
    @Body() dto: CreatePromotionRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreatePromotionResponseDto> {
    const result = await this.commandBus.execute<
      CreatePromotionCommand,
      Result<CreatePromotionResult, CreatePromotionApplicationError>
    >(
      new CreatePromotionCommand({
        tenantId: user.tenantId,
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
      throw toCreatePromotionProblem(result.error);
    }

    return result.value;
  }
}
