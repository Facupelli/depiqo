import { Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { SESSION_COOKIE_NAME } from '../../shared/session/auth-session.constants';
import { SessionRegeneratorService } from '../../shared/session/session-regenerator.service';

@Controller('auth')
export class LogoutController {
  constructor(private readonly sessionRegenerator: SessionRegeneratorService) {}

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.logoutFromPassport(req);
    await this.sessionRegenerator.destroy(req);

    res.clearCookie(SESSION_COOKIE_NAME, {
      path: '/',
    });
  }

  private logoutFromPassport(req: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      req.logout((error) => {
        if (error) {
          return reject(error);
        }

        resolve();
      });
    });
  }
}
