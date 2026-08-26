import { Controller, Get, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { GetCurrentTenantError, GetCurrentTenantErrorCode } from './get-current-tenant.errors';
import { GetCurrentTenantResult } from './get-current-tenant.handler';
import { GetCurrentTenantQuery } from './get-current-tenant.query';
import { GetCurrentTenantResponseDto } from './get-current-tenant.response.dto';

@Controller('tenant-management/tenant')
export class GetCurrentTenantHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<GetCurrentTenantResponseDto> {
    const result = await this.queryBus.execute<GetCurrentTenantQuery, GetCurrentTenantResult>(
      new GetCurrentTenantQuery(user.tenantId),
    );

    if (result.isErr()) {
      throw toGetCurrentTenantProblem(result.error);
    }

    return result.value;
  }
}

function toGetCurrentTenantProblem(error: GetCurrentTenantError): ProblemException {
  const problem = getCurrentTenantProblemMap[error.code];

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

const getCurrentTenantProblemMap = {
  'tenant_management.tenant_not_found': {
    type: createProblemType('tenant-management/tenant-not-found'),
    title: 'Tenant not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The current tenant could not be found.',
  },
} satisfies Record<GetCurrentTenantErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
