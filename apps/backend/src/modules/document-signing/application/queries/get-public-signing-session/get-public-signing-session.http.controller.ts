import { Controller, Get, Headers, Query, Res } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';
import { Response } from 'express';

import { Public } from 'src/core/decorators/public.decorator';
import { extractBearerToken } from '../../document-signing-public-http.helper';
import { PublicSigningSessionError } from '../../public-signing-session.errors';
import { toPublicSigningSessionProblem } from '../../public-signing-session.http-errors';
import { StreamPublicSignedDocumentService } from '../../services/stream-public-signed-document.service';
import { StreamPublicUnsignedDocumentService } from '../../services/stream-public-unsigned-document.service';

import { ResolvePublicSigningSessionQueryDto } from './get-public-signing-session.request.dto';
import {
  PublicSigningSessionResolveResponseDto,
  PublicSigningSessionResponseDto,
} from './get-public-signing-session.response.dto';
import { GetPublicSigningSessionQuery } from './get-public-signing-session.query';
import { ResolvePublicSigningSessionQuery } from '../resolve-public-signing-session/resolve-public-signing-session.query';

@Public()
@Controller('document-signing/public/sessions')
export class GetPublicSigningSessionHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly streamPublicUnsignedDocumentService: StreamPublicUnsignedDocumentService,
    private readonly streamPublicSignedDocumentService: StreamPublicSignedDocumentService,
  ) {}

  @Get('resolve')
  async resolve(@Query() query: ResolvePublicSigningSessionQueryDto): Promise<PublicSigningSessionResolveResponseDto> {
    const result = await this.queryBus.execute<
      ResolvePublicSigningSessionQuery,
      Result<PublicSigningSessionResolveResponseDto, PublicSigningSessionError>
    >(new ResolvePublicSigningSessionQuery(query.token));

    if (result.isErr()) {
      throw toPublicSigningSessionProblem(result.error);
    }

    return result.value;
  }

  @Get('me')
  async getSession(@Headers('authorization') authorization?: string): Promise<PublicSigningSessionResponseDto> {
    const result = await this.queryBus.execute<
      GetPublicSigningSessionQuery,
      Result<PublicSigningSessionResponseDto, PublicSigningSessionError>
    >(new GetPublicSigningSessionQuery(extractBearerToken(authorization)));

    if (result.isErr()) {
      throw toPublicSigningSessionProblem(result.error);
    }

    return result.value;
  }

  @Get('me/unsigned-pdf')
  async streamUnsignedPdf(
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.streamPublicUnsignedDocumentService.stream(extractBearerToken(authorization));
    if (result.isErr()) {
      throw toPublicSigningSessionProblem(result.error);
    }

    const document = result.value;

    res.set({
      'Content-Type': document.contentType,
      'Content-Disposition': `inline; filename="${document.fileName}"`,
      'Content-Length': document.contentLength,
    });

    document.stream.pipe(res);
  }

  @Get('me/signed-pdf')
  async streamSignedPdf(
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.streamPublicSignedDocumentService.stream(extractBearerToken(authorization));
    if (result.isErr()) {
      throw toPublicSigningSessionProblem(result.error);
    }

    const document = result.value;

    res.set({
      'Content-Type': document.contentType,
      'Content-Disposition': `attachment; filename="${document.fileName}"`,
      'Content-Length': document.contentLength,
    });

    document.stream.pipe(res);
  }
}
