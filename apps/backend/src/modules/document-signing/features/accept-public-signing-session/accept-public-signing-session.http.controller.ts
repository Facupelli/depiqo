import { Body, Controller, Headers, Ip, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AUTH_ACTOR_TYPES } from 'src/modules/tenant-management/auth/shared/auth.types';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantCustomerSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-customer-session.guard';

import { extractBearerToken } from '../../application/signing-bearer-token';
import { AcceptPublicSigningSessionCommand } from './accept-public-signing-session.command';
import { AcceptPublicSigningSessionResult } from './accept-public-signing-session.result';
import { mapAcceptPublicSigningSessionHttpError } from './accept-public-signing-session-http.mapper';
import { AcceptPublicSigningSessionBodyDto } from './accept-public-signing-session.request.dto';
import { AcceptPublicSigningSessionResponseDto } from './accept-public-signing-session.response.dto';
import { AcceptPublicSigningSessionCommandError } from './accept-public-signing-session.service';

@Controller('document-signing/public/sessions')
export class AcceptPublicSigningSessionHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('me/accept')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_CUSTOMER)
  @UseGuards(SessionAuthGuard, TenantCustomerSessionGuard)
  async accept(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string | undefined,
    @Body() body: AcceptPublicSigningSessionBodyDto,
  ): Promise<AcceptPublicSigningSessionResponseDto> {
    const result = await this.commandBus.execute<
      AcceptPublicSigningSessionCommand,
      Result<AcceptPublicSigningSessionResult, AcceptPublicSigningSessionCommandError>
    >(
      new AcceptPublicSigningSessionCommand(
        extractBearerToken(authorizationHeader),
        body.signatureImageDataUrl,
        body.acceptanceTextVersion,
        body.accepted,
        ipAddress,
        userAgent,
      ),
    );

    if (result.isErr()) {
      throw mapAcceptPublicSigningSessionHttpError(result.error);
    }

    return {
      requestId: result.value.requestId,
      status: result.value.status,
      signedAt: result.value.signedAt.toISOString(),
      downloadUrl: result.value.downloadUrl,
      receiptTokenExpiresAt: result.value.receiptTokenExpiresAt.toISOString(),
    };
  }
}
