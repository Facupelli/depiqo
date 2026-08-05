import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { Public } from 'src/core/decorators/public.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { RegisterTenantWithOwnerCommand } from './register-tenant-with-owner.command';
import { RegisterTenantWithOwnerError, RegisterTenantWithOwnerErrorCode } from './register-tenant-with-owner.errors';
import { RegisterTenantWithOwnerRequestDto } from './register-tenant-with-owner.request.dto';
import { RegisterTenantWithOwnerResponseDto } from './register-tenant-with-owner.response.dto';
import { RegisterTenantWithOwnerResponse } from './register-tenant-with-owner.service';
import { SkipCsrf } from '../../auth/shared/csrf/skip-csrf.decorator';

@Public()
@SkipCsrf()
@Controller('tenant-management')
export class RegisterTenantWithOwnerController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterTenantWithOwnerRequestDto): Promise<RegisterTenantWithOwnerResponseDto> {
    const result = await this.commandBus.execute<
      RegisterTenantWithOwnerCommand,
      Result<RegisterTenantWithOwnerResponse, RegisterTenantWithOwnerError>
    >(new RegisterTenantWithOwnerCommand(dto.tenant.name, dto.owner.name, dto.owner.email, dto.owner.password));

    if (result.isErr()) {
      throw toRegisterTenantWithOwnerProblem(result.error);
    }

    return result.value;
  }
}

function toRegisterTenantWithOwnerProblem(error: RegisterTenantWithOwnerError): ProblemException {
  const problem = registerTenantWithOwnerProblemMap[error.code];

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

const registerTenantWithOwnerProblemMap = {
  'tenant_management.tenant_registration_invalid_input': {
    type: createProblemType('tenant-management/tenant-registration-invalid-input'),
    title: 'Tenant registration input is invalid',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The tenant registration request contains invalid input.',
  },
  'tenant_management.tenant_slug_already_in_use': {
    type: createProblemType('tenant-management/tenant-slug-already-in-use'),
    title: 'Tenant slug already in use',
    status: HttpStatus.CONFLICT,
    detail: 'A tenant with the requested name already exists.',
  },
} satisfies Record<
  RegisterTenantWithOwnerErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
