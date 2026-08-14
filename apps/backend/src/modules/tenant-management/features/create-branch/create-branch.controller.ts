import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { CreateBranchCommand } from './create-branch.command';
import { CreateBranchError, CreateBranchErrorCode } from './create-branch.errors';
import { CreateBranchRequestDto } from './create-branch.request.dto';
import { CreateBranchResponseDto } from './create-branch.response.dto';
import { CreateBranchResult } from './create-branch.handler';

@Controller('tenant-management/branches')
export class CreateBranchHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBranch(
    @Body() dto: CreateBranchRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateBranchResponseDto> {
    const result = await this.commandBus.execute<CreateBranchCommand, Result<CreateBranchResult, CreateBranchError>>(
      new CreateBranchCommand({
        tenantId: user.tenantId,
        name: dto.name,
        address: dto.address ?? null,
        timezone: dto.timezone ?? null,
        supportsDelivery: dto.supportsDelivery ?? false,
        deliveryDefaultCountry: dto.deliveryDefaultCountry ?? null,
        deliveryDefaultStateRegion: dto.deliveryDefaultStateRegion ?? null,
        deliveryDefaultCity: dto.deliveryDefaultCity ?? null,
        deliveryDefaultPostalCode: dto.deliveryDefaultPostalCode ?? null,
        schedules: (dto.schedules ?? []).map((schedule) => ({
          type: schedule.type,
          dayOfWeek: schedule.dayOfWeek,
          specificDate: schedule.specificDate,
          openTime: schedule.openTime,
          closeTime: schedule.closeTime,
          slotIntervalMinutes: schedule.slotIntervalMinutes,
        })),
      }),
    );

    if (result.isErr()) {
      throw toCreateBranchProblem(result.error);
    }

    return result.value;
  }
}

function toCreateBranchProblem(error: CreateBranchError): ProblemException {
  const problem = createBranchProblemMap[error.code];

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

const createBranchProblemMap = {
  'tenant_management.branch_invalid_input': {
    type: createProblemType('tenant-management/branch-invalid-input'),
    title: 'Branch input is invalid',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The branch request contains invalid input.',
  },
  'tenant_management.branch_schedule_invalid_input': {
    type: createProblemType('tenant-management/branch-schedule-invalid-input'),
    title: 'Branch schedule input is invalid',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The branch schedule request contains invalid input.',
  },
} satisfies Record<CreateBranchErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
