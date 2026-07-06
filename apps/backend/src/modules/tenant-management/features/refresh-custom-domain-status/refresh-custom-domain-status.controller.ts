import { Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { toCustomDomainProblem } from '../custom-domain-http-error.mapper';
import { RefreshCustomDomainStatusCommand } from './refresh-custom-domain-status.command';
import { RefreshCustomDomainStatusResult } from './refresh-custom-domain-status.handler';
import { RefreshCustomDomainStatusResponseDto } from './refresh-custom-domain-status.response.dto';

@Controller('v2/tenant-management/tenant/custom-domain/refresh')
export class RefreshCustomDomainStatusHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  async refresh(@CurrentUser() user: AuthUser): Promise<RefreshCustomDomainStatusResponseDto> {
    const result = await this.commandBus.execute<RefreshCustomDomainStatusCommand, RefreshCustomDomainStatusResult>(
      new RefreshCustomDomainStatusCommand(user.tenantId),
    );

    if (result.isErr()) {
      throw toCustomDomainProblem(result.error);
    }

    return result.value;
  }
}
