import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { Public } from 'src/core/decorators/public.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { SkipCsrf } from '../../auth/shared/csrf/skip-csrf.decorator';
import { CurrentStorefrontTenant } from '../../tenant-context/decorators/current-storefront-tenant.decorator';
import { StorefrontTenantContextGuard } from '../../tenant-context/guards/storefront-tenant-context.guard';
import { StorefrontTenantContext } from '../../tenant-context/tenant-context.contract';
import { GetPublicTenantConfigError, GetPublicTenantConfigErrorCode } from './get-public-tenant-config.errors';
import { GetPublicTenantConfigResult } from './get-public-tenant-config.handler';
import { GetPublicTenantConfigQuery } from './get-public-tenant-config.query';
import { GetPublicTenantConfigResponseDto } from './get-public-tenant-config.response.dto';

@Public()
@SkipCsrf()
@Controller('storefront/tenant-management/tenant')
@UseGuards(StorefrontTenantContextGuard)
export class GetPublicTenantConfigHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('config')
  async getConfig(
    @CurrentStorefrontTenant() tenant: StorefrontTenantContext,
  ): Promise<GetPublicTenantConfigResponseDto> {
    const result = await this.queryBus.execute<GetPublicTenantConfigQuery, GetPublicTenantConfigResult>(
      new GetPublicTenantConfigQuery(tenant.tenantId),
    );

    if (result.isErr()) {
      throw toGetPublicTenantConfigProblem(result.error);
    }

    return result.value;
  }
}

function toGetPublicTenantConfigProblem(error: GetPublicTenantConfigError): ProblemException {
  const problem = getPublicTenantConfigProblemMap[error.code];

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

const getPublicTenantConfigProblemMap = {
  'tenant_management.tenant_not_found': {
    type: createProblemType('tenant-management/tenant-not-found'),
    title: 'Tenant not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The storefront tenant could not be found.',
  },
} satisfies Record<GetPublicTenantConfigErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
