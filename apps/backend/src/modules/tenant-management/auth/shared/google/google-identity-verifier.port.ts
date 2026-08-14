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

export abstract class GoogleIdentityVerifier {
  abstract verifyAuthorizationCode(params: VerifyGoogleAuthorizationCodeParams): Promise<VerifiedGoogleIdentity>;
}
