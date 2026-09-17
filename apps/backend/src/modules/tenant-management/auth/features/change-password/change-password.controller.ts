import type { ChangePasswordResponseDto } from '@repo/api-contracts';
import { Body, Controller, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthorizationExempt } from '../../../authorization/tenant-authorization.decorators';
import { AuthUser } from '../../shared/auth.types';
import { CsrfService } from '../../shared/csrf/csrf.service';
import { CurrentUser } from '../../shared/current-user/current-user.decorator';
import { SessionAuthGuard } from '../../shared/session/session-auth.guard';
import { SessionRegeneratorService } from '../../shared/session/session-regenerator.service';
import { TenantUserSessionGuard } from '../../shared/session/tenant-user-session.guard';
import { ChangePasswordError } from './change-password.errors';
import { ChangePasswordRequestDto } from './change-password.request.dto';
import { ChangePasswordService } from './change-password.service';

@Controller('auth')
export class ChangePasswordController {
  constructor(
    private readonly changePasswordService: ChangePasswordService,
    private readonly sessionRegenerator: SessionRegeneratorService,
    private readonly csrfService: CsrfService,
  ) {}

  @Post('change-password')
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  @AuthorizationExempt()
  async changePassword(
    @Req() req: Request,
    @CurrentUser() user: AuthUser,
    @Body() body: ChangePasswordRequestDto,
  ): Promise<ChangePasswordResponseDto> {
    const result = await this.changePasswordService.execute({
      tenantId: user.tenantId,
      tenantUserId: user.id,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
    if (result.isErr()) throw toChangePasswordProblem(result.error);

    await this.sessionRegenerator.regenerate(req);
    await loginWithPassport(req, result.value);
    const csrfToken = this.csrfService.rotateToken(req);

    return {
      user: {
        ...result.value,
        emailVerifiedAt: result.value.emailVerifiedAt?.toISOString() ?? null,
      },
      csrfToken,
    };
  }
}

function loginWithPassport(req: Request, user: AuthUser): Promise<void> {
  return new Promise((resolve, reject) => {
    req.login(user, (error) => (error ? reject(error) : resolve()));
  });
}

function toChangePasswordProblem(error: ChangePasswordError): ProblemException {
  const credentialMissing = error.code === 'tenant_management.local_credential_not_found';
  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: createProblemType(
        credentialMissing
          ? 'tenant-management/local-credential-not-found'
          : 'tenant-management/current-password-incorrect',
      ),
      title: credentialMissing ? 'Local credential unavailable' : 'Current password incorrect',
      status: credentialMissing ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST,
      detail: credentialMissing
        ? 'This account does not have a local credential that can be changed.'
        : 'The current password is incorrect.',
      extensions: { code: error.code },
    }),
    applicationError: error,
  });
}
