import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { Env } from 'src/config/env.schema';

const INTERNAL_AUTH_HEADER = 'x-internal-token';

@Injectable()
export class InternalTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const providedToken = request.header(INTERNAL_AUTH_HEADER);
    const expectedToken = this.configService.get('BFF_INTERNAL_TOKEN');

    if (!providedToken || !this.safeCompare(providedToken, expectedToken)) {
      throw new UnauthorizedException('Invalid internal credentials');
    }

    return true;
  }

  private safeCompare(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    if (aBuffer.length !== bBuffer.length) {
      return false;
    }

    return timingSafeEqual(aBuffer, bBuffer);
  }
}
