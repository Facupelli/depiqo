import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { Public } from 'src/core/decorators/public.decorator';

import { toRegisterTenantWithOwnerApplicationError } from './map-register-tenant-with-owner-error';
import { RegisterTenantWithOwnerCommand } from './register-tenant-with-owner.command';
import { toRegisterTenantWithOwnerProblem } from './register-tenant-with-owner-http-error.mapper';
import { RegisterTenantWithOwnerRequestDto } from './register-tenant-with-owner.request.dto';
import { RegisterTenantWithOwnerResponseDto } from './register-tenant-with-owner.response.dto';
import { SkipCsrf } from '../../auth/shared/csrf/skip-csrf.decorator';

@Public()
@SkipCsrf()
@Controller('tenant-management')
export class RegisterTenantWithOwnerController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterTenantWithOwnerRequestDto): Promise<RegisterTenantWithOwnerResponseDto> {
    const result = await this.commandBus.execute(
      new RegisterTenantWithOwnerCommand(dto.tenant.name, dto.owner.name, dto.owner.email, dto.owner.password),
    );

    if (result.isErr()) {
      throw toRegisterTenantWithOwnerProblem(toRegisterTenantWithOwnerApplicationError(result.error));
    }

    return result.value;
  }
}
