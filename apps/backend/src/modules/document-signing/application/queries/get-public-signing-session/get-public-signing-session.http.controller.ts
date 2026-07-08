import { Controller, Get, Headers, Query, Res } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Response } from 'express';

import { Public } from 'src/core/decorators/public.decorator';
import { extractBearerToken, mapDocumentSigningPublicHttpError } from '../../document-signing-public-http.helper';
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
    try {
      return await this.queryBus.execute(new ResolvePublicSigningSessionQuery(query.token));
    } catch (error) {
      throw mapDocumentSigningPublicHttpError(error, {
        signingRequestUnavailableAsProblemException: true,
      });
    }
  }

  @Get('me')
  async getSession(@Headers('authorization') authorization?: string): Promise<PublicSigningSessionResponseDto> {
    try {
      return await this.queryBus.execute(new GetPublicSigningSessionQuery(extractBearerToken(authorization)));
    } catch (error) {
      throw mapDocumentSigningPublicHttpError(error, {
        signingRequestUnavailableAsProblemException: true,
      });
    }
  }

  @Get('me/unsigned-pdf')
  async streamUnsignedPdf(
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const document = await this.streamPublicUnsignedDocumentService.stream(extractBearerToken(authorization));

      res.set({
        'Content-Type': document.contentType,
        'Content-Disposition': `inline; filename="${document.fileName}"`,
        'Content-Length': document.contentLength,
      });

      document.stream.pipe(res);
    } catch (error) {
      throw mapDocumentSigningPublicHttpError(error, {
        signingRequestUnavailableAsProblemException: true,
      });
    }
  }

  @Get('me/signed-pdf')
  async streamSignedPdf(
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const document = await this.streamPublicSignedDocumentService.stream(extractBearerToken(authorization));

      res.set({
        'Content-Type': document.contentType,
        'Content-Disposition': `attachment; filename="${document.fileName}"`,
        'Content-Length': document.contentLength,
      });

      document.stream.pipe(res);
    } catch (error) {
      throw mapDocumentSigningPublicHttpError(error, {
        signingRequestUnavailableAsProblemException: true,
      });
    }
  }
}
