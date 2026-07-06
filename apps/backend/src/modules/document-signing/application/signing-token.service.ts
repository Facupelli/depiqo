import { createHash, randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';

@Injectable()
export class SigningTokenService {
  generateRawToken(): string {
    return randomBytes(32).toString('hex');
  }

  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
