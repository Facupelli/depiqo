import { createHmac, timingSafeEqual } from 'node:crypto';

type JwtPayload = Record<string, unknown>;
type JwtVerifyOptions = {
  algorithms?: string[];
  typ?: string;
  issuer?: string;
  audience?: string;
};
type ProtectedHeader = { alg?: string; typ?: string };

export class SignJWT {
  private protectedHeader: ProtectedHeader = {};

  constructor(private readonly payload: JwtPayload) {}

  setProtectedHeader(header: ProtectedHeader): this {
    this.protectedHeader = header;
    return this;
  }

  setIssuer(issuer: string): this {
    this.payload.iss = issuer;
    return this;
  }

  setAudience(audience: string): this {
    this.payload.aud = audience;
    return this;
  }

  setIssuedAt(issuedAt: number): this {
    this.payload.iat = issuedAt;
    return this;
  }

  setExpirationTime(expirationTime: number): this {
    this.payload.exp = expirationTime;
    return this;
  }

  async sign(secret: Uint8Array): Promise<string> {
    const header = encodeJson(this.protectedHeader);
    const payload = encodeJson(this.payload);
    const signingInput = `${header}.${payload}`;
    const signature = sign(signingInput, secret);

    return `${signingInput}.${signature}`;
  }
}

export async function jwtVerify(token: string, secret: Uint8Array, options: JwtVerifyOptions = {}) {
  const [encodedHeader, encodedPayload, signature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !signature) throw new Error('Invalid JWT');

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(sign(signingInput, secret)))) {
    throw new Error('Invalid JWT signature');
  }

  const header = decodeJson<ProtectedHeader>(encodedHeader);
  const payload = decodeJson<JwtPayload>(encodedPayload);
  if (options.algorithms && (!header.alg || !options.algorithms.includes(header.alg))) {
    throw new Error('Invalid JWT algorithm');
  }
  if (options.typ && header.typ !== options.typ) throw new Error('Invalid JWT type');
  if (options.issuer && payload.iss !== options.issuer) throw new Error('Invalid JWT issuer');
  if (options.audience && payload.aud !== options.audience) throw new Error('Invalid JWT audience');
  if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) throw new Error('Expired JWT');

  return { payload };
}

export const createRemoteJWKSet = jest.fn();
export class JWTPayload {}

function sign(input: string, secret: Uint8Array): string {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decodeJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
}
