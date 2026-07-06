import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthUser } from '../../shared/auth.types';
import { ValidateLocalCredentialsService } from '../validate-local-credentials/validate-local-credentials.service';
import { Request } from 'express';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly validateLocalCredentialsService: ValidateLocalCredentialsService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, email: string, password: string): Promise<AuthUser> {
    return this.validateLocalCredentialsService.validateLocalCredentials({
      email,
      password,
      metadata: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });
  }
}
