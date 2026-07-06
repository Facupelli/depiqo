import { Injectable } from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Request } from 'express';
import { CSRF_TOKEN_BYTES } from './csrf.constants';

@Injectable()
export class CsrfService {
  getOrCreateToken(req: Request): string {
    if (!req.session) {
      throw new Error('Session is not initialized.');
    }

    if (!req.session.csrfToken) {
      req.session.csrfToken = this.generateToken();
    }

    return req.session.csrfToken;
  }

  rotateToken(req: Request): string {
    if (!req.session) {
      throw new Error('Session is not initialized.');
    }

    const token = this.generateToken();
    req.session.csrfToken = token;

    return token;
  }

  verifyToken(req: Request, submittedToken: string | undefined): boolean {
    const sessionToken = req.session?.csrfToken;

    if (!sessionToken || !submittedToken) {
      return false;
    }

    const sessionBuffer = Buffer.from(sessionToken, 'utf8');
    const submittedBuffer = Buffer.from(submittedToken, 'utf8');

    if (sessionBuffer.length !== submittedBuffer.length) {
      return false;
    }

    return timingSafeEqual(sessionBuffer, submittedBuffer);
  }

  private generateToken(): string {
    return randomBytes(CSRF_TOKEN_BYTES).toString('base64url');
  }
}
