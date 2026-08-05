import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { RegisterCustomDomainCommand } from './register-custom-domain.command';
import { RegisterCustomDomainError, RegisterCustomDomainErrorCode } from './register-custom-domain.errors';
import { RegisterCustomDomainResult } from './register-custom-domain.handler';
import { RegisterCustomDomainRequestDto } from './register-custom-domain.request.dto';
import { RegisterCustomDomainResponseDto } from './register-custom-domain.response.dto';

@Controller('tenant-management/tenant/custom-domain')
export class RegisterCustomDomainHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterCustomDomainRequestDto,
  ): Promise<RegisterCustomDomainResponseDto> {
    const result = await this.commandBus.execute<RegisterCustomDomainCommand, RegisterCustomDomainResult>(
      new RegisterCustomDomainCommand(user.tenantId, dto.domain),
    );

    if (result.isErr()) {
      throw toRegisterCustomDomainProblem(result.error);
    }

    return result.value;
  }
}

function toRegisterCustomDomainProblem(error: RegisterCustomDomainError): ProblemException {
  const problem = registerCustomDomainProblemMap[error.code];

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

const registerCustomDomainProblemMap = {
  'tenant_management.invalid_custom_domain': {
    type: createProblemType('tenant-management/invalid-custom-domain'),
    title: 'Custom domain is invalid',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The custom domain is invalid.',
  },
  'tenant_management.unsupported_apex_custom_domain': {
    type: createProblemType('tenant-management/unsupported-apex-custom-domain'),
    title: 'Apex custom domain is not supported',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Only subdomain custom domains are supported.',
  },
  'tenant_management.tenant_not_found': {
    type: createProblemType('tenant-management/tenant-not-found'),
    title: 'Tenant not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The current tenant could not be found.',
  },
  'tenant_management.custom_domain_already_in_use': {
    type: createProblemType('tenant-management/custom-domain-already-in-use'),
    title: 'Custom domain already in use',
    status: HttpStatus.CONFLICT,
    detail: 'The requested custom domain is already in use.',
  },
  'tenant_management.tenant_already_has_custom_domain': {
    type: createProblemType('tenant-management/tenant-already-has-custom-domain'),
    title: 'Tenant already has a custom domain',
    status: HttpStatus.CONFLICT,
    detail: 'The current tenant already has a custom domain.',
  },
} satisfies Record<RegisterCustomDomainErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
