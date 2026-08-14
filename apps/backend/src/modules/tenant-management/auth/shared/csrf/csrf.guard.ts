import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { CSRF_HEADER_NAME } from './csrf.constants';
import { CsrfService } from './csrf.service';
import { Reflector } from '@nestjs/core';
import { SKIP_CSRF_KEY } from './skip-csrf.decorator';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly csrfService: CsrfService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const shouldSkip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (shouldSkip) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(req.method)) {
      return true;
    }

    const submittedToken = req.get(CSRF_HEADER_NAME);

    if (!this.csrfService.verifyToken(req, submittedToken)) {
      throw new ForbiddenException('Invalid CSRF token.');
    }

    return true;
  }
}
