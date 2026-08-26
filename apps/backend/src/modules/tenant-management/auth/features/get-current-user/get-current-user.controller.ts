import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthActor } from '../../shared/auth.types';
import { CurrentUser } from '../../shared/current-user/current-user.decorator';
import { SessionAuthGuard } from '../../shared/session/session-auth.guard';

@Controller('auth')
export class GetCurrentUserController {
  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@CurrentUser() actor: AuthActor): AuthActor {
    return actor;
  }
}
