import { Body, Controller, HttpStatus, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { CurrentUser } from '../../shared/current-user/current-user.decorator';
import { AuthUser } from '../../shared/auth.types';
import { SessionAuthGuard } from '../../shared/session/session-auth.guard';
import { TenantUserSessionGuard } from '../../shared/session/tenant-user-session.guard';
import { WorkingBranchSessionError } from '../../shared/session/working-branch-session.errors';
import { WorkingBranchSessionService } from '../../shared/session/working-branch-session.service';
import { UpdateWorkingBranchRequestDto } from './update-working-branch.request.dto';
import { UpdateWorkingBranchResponseDto } from './update-working-branch.response.dto';

@Controller('auth')
export class UpdateWorkingBranchController {
  constructor(private readonly workingBranchSession: WorkingBranchSessionService) {}

  @Patch('working-branch')
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async update(
    @Req() req: Request,
    @Body() dto: UpdateWorkingBranchRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UpdateWorkingBranchResponseDto> {
    const result = await this.workingBranchSession.update(req, user.tenantId, dto.workingBranchId);

    if (result.isErr()) throw toUpdateWorkingBranchProblem(result.error);

    return result.value;
  }
}

function toUpdateWorkingBranchProblem(error: WorkingBranchSessionError): ProblemException {
  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: createProblemType('tenant-management/branch-not-found'),
      title: 'Branch not found',
      status: HttpStatus.NOT_FOUND,
      detail: 'The requested branch was not found.',
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}
