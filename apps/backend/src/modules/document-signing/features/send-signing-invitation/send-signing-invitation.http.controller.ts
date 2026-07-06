import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';
import { SigningDocumentType } from 'src/generated/prisma/client';
import { mapSendSigningInvitationHttpError } from './send-signing-invitation-http.mapper';
import { SendSigningInvitationCommand } from './send-signing-invitation.command';
import { SendSigningInvitationResult } from './send-signing-invitation.result';
import { SendSigningInvitationBodyDto, SendSigningInvitationParamDto } from './send-signing-invitation.request.dto';
import { SendSigningInvitationResponseDto } from './send-signing-invitation.response.dto';
import { SendSigningInvitationCommandError } from './send-signing-invitation.service';

@Controller('v2/document-signing/orders/:orderId/sessions')
export class SendSigningInvitationHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async sendInvitation(
    @Param() params: SendSigningInvitationParamDto,
    @CurrentUser() user: AuthUser,
    @Body() body: SendSigningInvitationBodyDto,
  ): Promise<SendSigningInvitationResponseDto> {
    const result = await this.commandBus.execute<
      SendSigningInvitationCommand,
      Result<SendSigningInvitationResult, SendSigningInvitationCommandError>
    >(
      new SendSigningInvitationCommand(
        user.tenantId,
        params.orderId,
        SigningDocumentType.RENTAL_AGREEMENT,
        body.recipientEmail,
      ),
    );

    if (result.isErr()) {
      throw mapSendSigningInvitationHttpError(result.error);
    }

    return {
      ...result.value,
      expiresAt: result.value.expiresAt.toISOString(),
    };
  }
}
