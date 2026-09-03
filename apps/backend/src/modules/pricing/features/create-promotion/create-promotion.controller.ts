import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { CreatePromotionCommand } from './create-promotion.command';
import { CreatePromotionError, CreatePromotionErrorCode } from './create-promotion.errors';
import { CreatePromotionResult } from './create-promotion.handler';
import { CreatePromotionRequestDto } from './create-promotion.request.dto';
import { CreatePromotionResponseDto } from './create-promotion.response.dto';

@Controller('pricing/promotions')
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
      Result<CreatePromotionResult, CreatePromotionError>
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

function toCreatePromotionProblem(error: CreatePromotionError): ProblemException {
  const problem = createPromotionProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const createPromotionProblemMap = {
  'pricing.invalid_promotion_configuration': {
    type: createProblemType('pricing.invalid_promotion_configuration'),
    title: 'Invalid promotion configuration',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The promotion could not be created because it violates pricing rules.',
  },
  'pricing.duplicate_promotion_target': {
    type: createProblemType('pricing.duplicate_promotion_target'),
    title: 'Duplicate promotion target',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The promotion contains duplicate scope or exclusion targets.',
  },
} satisfies Record<CreatePromotionErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
