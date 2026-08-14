import { Body, Controller, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { UpdatePromotionCommand } from './update-promotion.command';
import { UpdatePromotionError, UpdatePromotionErrorCode } from './update-promotion.errors';
import { UpdatePromotionResult } from './update-promotion.handler';
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
      Result<UpdatePromotionResult, UpdatePromotionError>
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

function toUpdatePromotionProblem(error: UpdatePromotionError): ProblemException {
  const problem = updatePromotionProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const updatePromotionProblemMap = {
  'pricing.promotion_not_found': {
    type: createProblemType('pricing.promotion_not_found'),
    title: 'Promotion not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The promotion could not be found.',
  },
  'pricing.invalid_promotion_configuration': {
    type: createProblemType('pricing.invalid_promotion_configuration'),
    title: 'Invalid promotion configuration',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The promotion could not be updated because it violates pricing rules.',
  },
  'pricing.duplicate_promotion_target': {
    type: createProblemType('pricing.duplicate_promotion_target'),
    title: 'Duplicate promotion target',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The promotion contains duplicate scope or exclusion targets.',
  },
} satisfies Record<UpdatePromotionErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
