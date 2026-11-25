import { Body, Controller, Get, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { RequirePermission } from '../../authorization/tenant-authorization.decorators';
import { GetBranchDetailParamsDto } from '../get-branch-detail/get-branch-detail.request.dto';
import { UpdateBranchRentalAssetBufferRequestDto } from './branch-rental-asset-buffer.request.dto';
import { GetBranchRentalAssetBufferResponseDto } from './branch-rental-asset-buffer.response.dto';
import { GetBranchRentalAssetBufferResult } from './get-branch-rental-asset-buffer.handler';
import { GetBranchRentalAssetBufferQuery } from './get-branch-rental-asset-buffer.query';
import { UpdateBranchRentalAssetBufferCommand } from './update-branch-rental-asset-buffer.command';
import { UpdateBranchRentalAssetBufferResult } from './update-branch-rental-asset-buffer.handler';

@Controller('tenant-management/branches/:branchId/rental-asset-buffer')
export class GetBranchRentalAssetBufferHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermission(TenantPermission.BranchesManage)
  async getBranchRentalAssetBuffer(
    @Param() params: GetBranchDetailParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetBranchRentalAssetBufferResponseDto> {
    const result = await this.queryBus.execute<GetBranchRentalAssetBufferQuery, GetBranchRentalAssetBufferResult>(
      new GetBranchRentalAssetBufferQuery(user.tenantId, params.branchId),
    );
    if (result.isErr()) throw toBranchRentalAssetBufferProblem(result.error);
    return {
      beforeBufferMinutes: result.value.beforeBufferMinutes,
      afterBufferMinutes: result.value.afterBufferMinutes,
    };
  }
}

@Controller('tenant-management/branches/:branchId/rental-asset-buffer')
export class UpdateBranchRentalAssetBufferHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put()
  @RequirePermission(TenantPermission.BranchesManage)
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateBranchRentalAssetBuffer(
    @Param() params: GetBranchDetailParamsDto,
    @Body() dto: UpdateBranchRentalAssetBufferRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<
      UpdateBranchRentalAssetBufferCommand,
      UpdateBranchRentalAssetBufferResult
    >(
      new UpdateBranchRentalAssetBufferCommand(
        user.tenantId,
        params.branchId,
        dto.beforeBufferMinutes,
        dto.afterBufferMinutes,
      ),
    );
    if (result.isErr()) throw toBranchRentalAssetBufferProblem(result.error);
  }
}

function toBranchRentalAssetBufferProblem(error: { code: 'BranchNotFound' | 'InvalidBufferMinutes'; message: string }) {
  const problem = branchRentalAssetBufferProblems[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: createProblemType(problem.type),
      title: problem.title,
      status: problem.status,
      detail: error.message,
      extensions: { code: problem.code },
    }),
    applicationError: { code: problem.code, message: error.message },
  });
}

const branchRentalAssetBufferProblems = {
  BranchNotFound: {
    type: 'tenant-management/branch-not-found',
    title: 'Branch not found',
    status: HttpStatus.NOT_FOUND,
    code: 'tenant_management.branch_not_found',
  },
  InvalidBufferMinutes: {
    type: 'tenant-management/invalid-rental-asset-buffer',
    title: 'Invalid rental asset buffer',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    code: 'tenant_management.invalid_rental_asset_buffer',
  },
};
