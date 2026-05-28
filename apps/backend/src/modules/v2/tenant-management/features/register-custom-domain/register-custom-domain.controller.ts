import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { toCustomDomainProblem } from '../custom-domain-http-error.mapper';
import { RegisterCustomDomainCommand } from './register-custom-domain.command';
import { RegisterCustomDomainResult } from './register-custom-domain.handler';
import { RegisterCustomDomainRequestDto } from './register-custom-domain.request.dto';
import { RegisterCustomDomainResponseDto } from './register-custom-domain.response.dto';

@Controller('v2/tenant-management/tenant/custom-domain')
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
      throw toCustomDomainProblem(result.error);
    }

    return result.value;
  }
}
