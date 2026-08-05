import { Controller, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { RefreshCustomDomainStatusCommand } from './refresh-custom-domain-status.command';
import {
  RefreshCustomDomainStatusError,
  RefreshCustomDomainStatusErrorCode,
} from './refresh-custom-domain-status.errors';
import { RefreshCustomDomainStatusResult } from './refresh-custom-domain-status.handler';
import { RefreshCustomDomainStatusResponseDto } from './refresh-custom-domain-status.response.dto';

@Controller('tenant-management/tenant/custom-domain/refresh')
export class RefreshCustomDomainStatusHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  async refresh(@CurrentUser() user: AuthUser): Promise<RefreshCustomDomainStatusResponseDto> {
    const result = await this.commandBus.execute<RefreshCustomDomainStatusCommand, RefreshCustomDomainStatusResult>(
      new RefreshCustomDomainStatusCommand(user.tenantId),
    );

    if (result.isErr()) {
      throw toRefreshCustomDomainStatusProblem(result.error);
    }

    return result.value;
  }
}

function toRefreshCustomDomainStatusProblem(error: RefreshCustomDomainStatusError): ProblemException {
  const problem = refreshCustomDomainStatusProblemMap[error.code];

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

const refreshCustomDomainStatusProblemMap = {
  'tenant_management.custom_domain_not_found': {
    type: createProblemType('tenant-management/custom-domain-not-found'),
    title: 'Custom domain not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'No custom domain was found for the current tenant.',
  },
} satisfies Record<
  RefreshCustomDomainStatusErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
