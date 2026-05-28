import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

import { Env } from 'src/config/env.schema';

const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

const googleJwks = createRemoteJWKSet(GOOGLE_JWKS_URL);

export interface VerifyGoogleAuthorizationCodeParams {
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}

export interface VerifiedGoogleIdentity {
  provider: 'GOOGLE';
  providerSubject: string;
  email: string;
  emailVerified: boolean;
  givenName: string | null;
  familyName: string | null;
  pictureUrl: string | null;
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GoogleIdTokenClaims extends JWTPayload {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export class GoogleAuthorizationCodeExchangeError extends Error {
  constructor(message = 'Failed to exchange Google authorization code.') {
    super(message);
  }
}

export class GoogleIdentityVerificationError extends Error {
  constructor(message = 'Failed to verify Google identity.') {
    super(message);
  }
}

@Injectable()
export class GoogleIdentityVerificationService {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  async verifyAuthorizationCode(params: VerifyGoogleAuthorizationCodeParams): Promise<VerifiedGoogleIdentity> {
    const tokenResponse = await this.exchangeAuthorizationCode(params);

    if (!tokenResponse.id_token) {
      throw new GoogleAuthorizationCodeExchangeError('Google token response did not include an ID token.');
    }

    return this.verifyIdToken(tokenResponse.id_token);
  }

  private async exchangeAuthorizationCode(params: VerifyGoogleAuthorizationCodeParams): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams({
      code: params.code,
      client_id: this.configService.get('GOOGLE_CLIENT_ID'),
      grant_type: 'authorization_code',
      redirect_uri: params.redirectUri,
    });

    const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
    if (clientSecret) {
      body.set('client_secret', clientSecret);
    }

    if (params.codeVerifier) {
      body.set('code_verifier', params.codeVerifier);
    }

    try {
      const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      const payload = (await response.json()) as GoogleTokenResponse;

      if (!response.ok) {
        const reason = payload.error_description ?? payload.error ?? 'Google rejected the authorization code.';
        throw new GoogleAuthorizationCodeExchangeError(reason);
      }

      return payload;
    } catch {
      throw new GoogleAuthorizationCodeExchangeError('Google token endpoint returned an invalid response.');
    }
  }

  private async verifyIdToken(idToken: string): Promise<VerifiedGoogleIdentity> {
    let payload: GoogleIdTokenClaims;

    try {
      const verification = await jwtVerify(idToken, googleJwks, {
        audience: this.configService.get('GOOGLE_CLIENT_ID'),
        issuer: Array.from(GOOGLE_ISSUERS),
      });

      payload = verification.payload as GoogleIdTokenClaims;
    } catch {
      throw new GoogleIdentityVerificationError('Google ID token verification failed.');
    }

    if (!payload.sub) {
      throw new GoogleIdentityVerificationError('Google ID token is missing subject claim.');
    }

    if (!payload.email) {
      throw new GoogleIdentityVerificationError('Google ID token is missing email claim.');
    }

    if (payload.email_verified !== true) {
      throw new GoogleIdentityVerificationError('Google account email is not verified.');
    }

    return {
      provider: 'GOOGLE',
      providerSubject: payload.sub,
      email: payload.email,
      emailVerified: true,
      givenName: payload.given_name ?? null,
      familyName: payload.family_name ?? null,
      pictureUrl: payload.picture ?? null,
    };
  }
}
