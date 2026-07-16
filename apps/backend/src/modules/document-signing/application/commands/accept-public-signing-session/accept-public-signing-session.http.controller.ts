import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { Public } from 'src/core/decorators/public.decorator';
import { extractBearerToken } from '../../document-signing-public-http.helper';
import { AcceptPublicSigningSessionCommand } from './accept-public-signing-session.command';
import { toAcceptPublicSigningSessionProblem } from './accept-public-signing-session.http-errors';
import { AcceptPublicSigningError, AcceptPublicSigningResult } from './accept-public-signing-session.contract';
import { AcceptPublicSigningSessionBodyDto } from './accept-public-signing-session.request.dto';
import { AcceptPublicSigningSessionResponseDto } from './accept-public-signing-session.response.dto';

@Public()
@Controller('document-signing/public/sessions')
export class AcceptPublicSigningSessionHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('me/accept')
  @HttpCode(HttpStatus.OK)
  async accept(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: AcceptPublicSigningSessionBodyDto,
  ): Promise<AcceptPublicSigningSessionResponseDto> {
    const result = await this.commandBus.execute<
      AcceptPublicSigningSessionCommand,
      Result<AcceptPublicSigningResult, AcceptPublicSigningError>
    >(
      new AcceptPublicSigningSessionCommand(
        extractBearerToken(authorization),
        body.signatureImageDataUrl,
        body.acceptanceTextVersion,
        body.accepted,
      ),
    );

    if (result.isErr()) {
      throw toAcceptPublicSigningSessionProblem(result.error);
    }

    return result.value;
  }
}
