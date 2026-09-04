import { Body, Controller, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';

import { PutBranchDeliveryConfigurationCommand } from './put-branch-delivery-configuration.command';
import {
  PutBranchDeliveryConfigurationError,
  PutBranchDeliveryConfigurationErrorCode,
} from './put-branch-delivery-configuration.errors';
import { PutBranchDeliveryConfigurationResult } from './put-branch-delivery-configuration.handler';
import {
  PutBranchDeliveryConfigurationParamsDto,
  PutBranchDeliveryConfigurationRequestDto,
} from './put-branch-delivery-configuration.request.dto';
import { PutBranchDeliveryConfigurationResponseDto } from './put-branch-delivery-configuration.response.dto';

@Controller('delivery/branches')
export class PutBranchDeliveryConfigurationHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(':branchId/configuration')
  @HttpCode(HttpStatus.OK)
  async putConfiguration(
    @Param() params: PutBranchDeliveryConfigurationParamsDto,
    @Body() dto: PutBranchDeliveryConfigurationRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PutBranchDeliveryConfigurationResponseDto> {
    const result = await this.commandBus.execute<
      PutBranchDeliveryConfigurationCommand,
      PutBranchDeliveryConfigurationResult
    >(
      new PutBranchDeliveryConfigurationCommand({
        tenantId: user.tenantId,
        branchId: params.branchId,
        configuration: {
          enabled: dto.enabled,
          currency: dto.currency,
          maximumDistanceMeters: dto.maximumDistanceMeters,
          eligibleWeekdays: dto.eligibleWeekdays,
          eligibilityStartMinute: dto.eligibilityStartMinute,
          eligibilityEndMinute: dto.eligibilityEndMinute,
          normalServiceStartMinute: dto.normalServiceStartMinute,
          normalServiceEndMinute: dto.normalServiceEndMinute,
          specialHoursSurcharge: dto.specialHoursSurcharge,
          transportReservationMinutes: dto.transportReservationMinutes,
          distancePriceBands: dto.distancePriceBands.map((band) => ({
            maxDistanceMeters: band.maxDistanceMeters,
            price: band.price,
          })),
        },
      }),
    );

    if (result.isErr()) throw toPutBranchDeliveryConfigurationProblem(result.error);

    return result.value;
  }
}

function toPutBranchDeliveryConfigurationProblem(error: PutBranchDeliveryConfigurationError): ProblemException {
  const problem = putBranchDeliveryConfigurationProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const putBranchDeliveryConfigurationProblemMap = {
  'delivery.branch_not_found': {
    type: createProblemType('delivery/branch-not-found'),
    title: 'Branch not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested branch was not found.',
  },
  'delivery.configuration_invalid': {
    type: createProblemType('delivery/configuration-invalid'),
    title: 'Delivery configuration is invalid',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The Delivery configuration contains invalid settings.',
  },
} satisfies Record<
  PutBranchDeliveryConfigurationErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
