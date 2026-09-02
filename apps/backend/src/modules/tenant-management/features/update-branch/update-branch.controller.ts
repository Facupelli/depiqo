import { Body, Controller, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { UpdateBranchCommand } from './update-branch.command';
import { UpdateBranchError, UpdateBranchErrorCode } from './update-branch.errors';
import { UpdateBranchResult } from './update-branch.handler';
import { UpdateBranchParamsDto, UpdateBranchRequestDto } from './update-branch.request.dto';
import { UpdateBranchResponseDto } from './update-branch.response.dto';

@Controller('tenant-management/branches')
export class UpdateBranchHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(':branchId')
  @HttpCode(HttpStatus.OK)
  async updateBranch(
    @Param() params: UpdateBranchParamsDto,
    @Body() dto: UpdateBranchRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UpdateBranchResponseDto> {
    const result = await this.commandBus.execute<UpdateBranchCommand, Result<UpdateBranchResult, UpdateBranchError>>(
      new UpdateBranchCommand({
        tenantId: user.tenantId,
        branchId: params.branchId,
        name: dto.name,
        address: dto.address ?? null,
        addressLocationId: dto.addressLocationId ?? null,
        timezone: dto.timezone ?? null,
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
      throw toUpdateBranchProblem(result.error);
    }

    return result.value;
  }
}

function toUpdateBranchProblem(error: UpdateBranchError): ProblemException {
  const problem = updateBranchProblemMap[error.code];

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

const updateBranchProblemMap = {
  'tenant_management.branch_not_found': {
    type: createProblemType('tenant-management/branch-not-found'),
    title: 'Branch not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested branch was not found.',
  },
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
  'tenant_management.branch_address_unresolved': {
    type: createProblemType('tenant-management/branch-address-unresolved'),
    title: 'Branch address was not found',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The branch address could not be resolved.',
  },
  'tenant_management.branch_address_ambiguous': {
    type: createProblemType('tenant-management/branch-address-ambiguous'),
    title: 'Branch address is ambiguous',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The branch address matches multiple possible locations.',
  },
} satisfies Record<UpdateBranchErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
