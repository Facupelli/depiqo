import { Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { LoginRequest } from '../../shared/auth-request.types';
import { AuthUser } from '../../shared/auth.types';
import { CsrfService } from '../../shared/csrf/csrf.service';
import { SessionRegeneratorService } from '../../shared/session/session-regenerator.service';
import { LocalAuthGuard } from './local-auth.guard';
import { Public } from 'src/core/decorators/public.decorator';
import { SkipCsrf } from '../../shared/csrf/skip-csrf.decorator';

@Public()
@SkipCsrf()
@Controller('v2/auth')
export class LoginController {
  constructor(
    private readonly sessionRegenerator: SessionRegeneratorService,
    private readonly csrfService: CsrfService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  async login(@Req() req: LoginRequest): Promise<{ user: AuthUser; csrfToken: string }> {
    const user = req.user;

    await this.sessionRegenerator.regenerate(req);
    await this.loginWithPassport(req, user);

    const csrfToken = this.csrfService.rotateToken(req);

    return {
      user,
      csrfToken,
    };
  }

  private loginWithPassport(req: Request, user: AuthUser): Promise<void> {
    return new Promise((resolve, reject) => {
      req.login(user, (error) => {
        if (error) {
          return reject(error);
        }

        resolve();
      });
    });
  }
}
