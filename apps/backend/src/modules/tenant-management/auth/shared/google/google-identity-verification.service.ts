import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

import { Env } from 'src/config/env.schema';

import {
  GoogleIdentityVerifier,
  VerifiedGoogleIdentity,
  VerifyGoogleAuthorizationCodeParams,
} from './google-identity-verifier.port';

const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

const googleJwks = createRemoteJWKSet(GOOGLE_JWKS_URL);

interface GoogleTokenResponse {
  error?: string;
  error_description?: string;
  id_token?: string;
}

function parseGoogleTokenResponse(payload: unknown): GoogleTokenResponse {
  if (!isRecord(payload)) {
    throw new TypeError('Google token response must be a JSON object.');
  }

  return {
    error: stringValue(payload.error),
    error_description: stringValue(payload.error_description),
    id_token: stringValue(payload.id_token),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

interface GoogleIdTokenClaims extends JWTPayload {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

type GoogleAuthorizationCodeExchangeErrorMetadata = {
  cause?: unknown;
  googleError?: string;
  googleErrorDescription?: string;
  googleStatus?: number;
};

export class GoogleAuthorizationCodeExchangeError extends Error {
  readonly googleError?: string;
  readonly googleErrorDescription?: string;
  readonly googleStatus?: number;

  constructor(
    message = 'Failed to exchange Google authorization code.',
    metadata: GoogleAuthorizationCodeExchangeErrorMetadata = {},
  ) {
    super(message, { cause: metadata.cause });
    this.name = GoogleAuthorizationCodeExchangeError.name;
    this.googleError = metadata.googleError;
    this.googleErrorDescription = metadata.googleErrorDescription;
    this.googleStatus = metadata.googleStatus;
  }
}

export class GoogleIdentityVerificationError extends Error {
  constructor(message = 'Failed to verify Google identity.') {
    super(message);
  }
}

@Injectable()
export class GoogleIdentityVerificationService extends GoogleIdentityVerifier {
  constructor(private readonly configService: ConfigService<Env, true>) {
    super();
  }

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

    let response: Response;
    try {
      response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
    } catch (error) {
      throw new GoogleAuthorizationCodeExchangeError('Google token endpoint returned an invalid response.', {
        cause: error,
      });
    }

    let payload: GoogleTokenResponse;
    try {
      payload = parseGoogleTokenResponse(await response.json());
    } catch (error) {
      throw new GoogleAuthorizationCodeExchangeError('Google token endpoint returned an invalid response.', {
        cause: error,
        googleStatus: response.status,
      });
    }

    if (!response.ok) {
      if (!payload.error) {
        throw new GoogleAuthorizationCodeExchangeError('Google token endpoint returned an invalid response.', {
          googleStatus: response.status,
        });
      }

      throw new GoogleAuthorizationCodeExchangeError('Google rejected the authorization code.', {
        googleError: payload.error,
        googleErrorDescription: payload.error_description,
        googleStatus: response.status,
      });
    }

    return payload;
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
