import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { Env } from 'src/config/env.schema';

export interface IssueGoogleAuthStateParams {
  tenantId: string;
  portalOrigin: string;
  redirectPath: string;
}

export interface VerifiedGoogleAuthState {
  tenantId: string;
  portalOrigin: string;
  redirectPath: string;
  nonce: string;
}

interface GoogleAuthStatePayload extends VerifiedGoogleAuthState {
  typ: 'v2-rental-customer-google-auth-state';
}

export class GoogleAuthStateVerificationError extends Error {
  constructor(message = 'Failed to verify Google auth state.') {
    super(message);
  }
}

@Injectable()
export class GoogleAuthStateService {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly jwtService: JwtService,
  ) {}

  issueState(params: IssueGoogleAuthStateParams): string {
    const payload: GoogleAuthStatePayload = {
      typ: 'v2-rental-customer-google-auth-state',
      tenantId: params.tenantId,
      portalOrigin: params.portalOrigin,
      redirectPath: params.redirectPath,
      nonce: randomUUID(),
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('GOOGLE_AUTH_STATE_SECRET'),
      expiresIn: this.configService.get('GOOGLE_AUTH_STATE_EXPIRATION_TIME_SECONDS'),
    });
  }

  verifyState(state: string): VerifiedGoogleAuthState {
    try {
      const payload = this.jwtService.verify<GoogleAuthStatePayload>(state, {
        secret: this.configService.get('GOOGLE_AUTH_STATE_SECRET'),
      });

      if (payload.typ !== 'v2-rental-customer-google-auth-state') {
        throw new GoogleAuthStateVerificationError('Unexpected state type.');
      }

      if (!payload.tenantId || !payload.portalOrigin || !payload.redirectPath || !payload.nonce) {
        throw new GoogleAuthStateVerificationError('Required state fields are missing.');
      }

      return {
        tenantId: payload.tenantId,
        portalOrigin: payload.portalOrigin,
        redirectPath: payload.redirectPath,
        nonce: payload.nonce,
      };
    } catch (error) {
      if (error instanceof GoogleAuthStateVerificationError) {
        throw error;
      }

      throw new GoogleAuthStateVerificationError('State signature or expiry is invalid.');
    }
  }
}
