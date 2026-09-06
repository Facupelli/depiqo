import type { GetCurrentUserResponseDto } from '@repo/api-contracts';
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { AuthActor } from '../../shared/auth.types';
import { CurrentUser } from '../../shared/current-user/current-user.decorator';
import { SessionAuthGuard } from '../../shared/session/session-auth.guard';
import { WorkingBranchSessionService } from '../../shared/session/working-branch-session.service';

@Controller('auth')
export class GetCurrentUserController {
  constructor(private readonly workingBranchSession: WorkingBranchSessionService) {}

  @Get('me')
  @UseGuards(SessionAuthGuard)
  async me(@Req() req: Request, @CurrentUser() actor: AuthActor): Promise<GetCurrentUserResponseDto> {
    const workingBranchId = await this.workingBranchSession.resolve(req, actor.tenantId);

    return {
      ...actor,
      emailVerifiedAt: actor.emailVerifiedAt?.toISOString() ?? null,
      workingBranchId,
    };
  }
}
