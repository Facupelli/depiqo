import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Permission } from '@repo/types';
import { Result } from 'neverthrow';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { StaffRoute } from 'src/core/decorators/staff-route.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';
import { SigningDocumentType } from 'src/generated/prisma/client';
import { mapSendSigningInvitationHttpError } from './send-signing-invitation-http.mapper';
import { SendSigningInvitationCommand } from './send-signing-invitation.command';
import { SendSigningInvitationResult } from './send-signing-invitation.contract';
import { SendSigningInvitationBodyDto, SendSigningInvitationParamDto } from './send-signing-invitation.request.dto';
import { SendSigningInvitationResponseDto } from './send-signing-invitation.response.dto';
import { SendSigningInvitationCommandError } from './send-signing-invitation.service';

@StaffRoute(Permission.CONFIRM_ORDERS)
@Controller('document-signing/orders/:orderId/sessions')
export class SendSigningInvitationHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async sendInvitation(
    @Param() params: SendSigningInvitationParamDto,
    @CurrentUser() user: AuthenticatedUser,
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

    return result.value;
  }
}
