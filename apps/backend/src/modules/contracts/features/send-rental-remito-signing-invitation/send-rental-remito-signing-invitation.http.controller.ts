import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { SigningDocumentType } from 'src/generated/prisma/client';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { mapSendRentalRemitoSigningInvitationHttpError } from './send-rental-remito-signing-invitation-http.mapper';
import { SendRentalRemitoSigningInvitationCommand } from './send-rental-remito-signing-invitation.command';
import { SendRentalRemitoSigningInvitationResult } from './send-rental-remito-signing-invitation.contract';
import {
  SendRentalRemitoSigningInvitationBodyDto,
  SendRentalRemitoSigningInvitationParamDto,
} from './send-rental-remito-signing-invitation.request.dto';
import { SendRentalRemitoSigningInvitationResponseDto } from './send-rental-remito-signing-invitation.response.dto';
import { SendRentalRemitoSigningInvitationCommandError } from './send-rental-remito-signing-invitation.service';

@Controller('document-signing/orders/:orderId/sessions')
export class SendRentalRemitoSigningInvitationHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async sendInvitation(
    @Param() params: SendRentalRemitoSigningInvitationParamDto,
    @CurrentUser() user: AuthUser,
    @Body() body: SendRentalRemitoSigningInvitationBodyDto,
  ): Promise<SendRentalRemitoSigningInvitationResponseDto> {
    const result = await this.commandBus.execute<
      SendRentalRemitoSigningInvitationCommand,
      Result<SendRentalRemitoSigningInvitationResult, SendRentalRemitoSigningInvitationCommandError>
    >(
      new SendRentalRemitoSigningInvitationCommand(
        user.tenantId,
        params.orderId,
        SigningDocumentType.RENTAL_AGREEMENT,
        body.recipientEmail,
      ),
    );

    if (result.isErr()) {
      throw mapSendRentalRemitoSigningInvitationHttpError(result.error);
    }

    return result.value;
  }
}
