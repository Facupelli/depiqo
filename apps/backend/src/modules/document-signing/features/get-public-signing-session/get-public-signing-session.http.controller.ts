import { Controller, Get, Headers, HttpStatus, Query, Res } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';
import { Response } from 'express';

import { Public } from 'src/core/decorators/public.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { extractBearerToken } from '../../application/document-signing-public-http.helper';
import { PublicSigningSessionError } from '../../application/public-signing-session.errors';
import { toPublicSigningSessionProblem } from '../../application/public-signing-session.http-errors';
import { StreamPublicUnsignedDocumentService } from '../stream-public-unsigned-document/stream-public-unsigned-document.service';

import { ResolvePublicSigningSessionQueryDto } from './get-public-signing-session.request.dto';
import {
  PublicSigningSessionResolveResponseDto,
  PublicSigningSessionResponseDto,
} from './get-public-signing-session.response.dto';
import { GetPublicSigningSessionError, GetPublicSigningSessionErrorCode } from './get-public-signing-session.errors';
import { GetPublicSigningSessionQuery } from './get-public-signing-session.query';
import { ResolvePublicSigningSessionQuery } from '../resolve-public-signing-session/resolve-public-signing-session.query';

@Public()
@Controller('document-signing/public/sessions')
export class GetPublicSigningSessionHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly streamPublicUnsignedDocumentService: StreamPublicUnsignedDocumentService,
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
      Result<PublicSigningSessionResponseDto, GetPublicSigningSessionError>
    >(new GetPublicSigningSessionQuery(extractBearerToken(authorization)));

    if (result.isErr()) {
      throw toGetPublicSigningSessionProblem(result.error);
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
}

function toGetPublicSigningSessionProblem(error: GetPublicSigningSessionError): ProblemException {
  const problem = getPublicSigningSessionProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const getPublicSigningSessionProblemMap = {
  'document_signing.signing_token_not_found': {
    type: createProblemType('document-signing/signing-token-not-found'),
    title: 'Signing token not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The signing session could not be found for the provided token.',
  },
  'document_signing.signing_request_expired': {
    type: createProblemType('document-signing/signing-request-expired'),
    title: 'Signing request expired',
    status: HttpStatus.GONE,
    detail: 'The signing request has expired.',
  },
  'document_signing.signing_request_unavailable': {
    type: createProblemType('document-signing/signing-request-unavailable'),
    title: 'Signing request unavailable',
    status: HttpStatus.CONFLICT,
    detail: 'The signing request is not available for this action.',
  },
  'document_signing.signing_request_conflict': {
    type: createProblemType('document-signing/signing-request-conflict'),
    title: 'Signing request conflict',
    status: HttpStatus.CONFLICT,
    detail: 'The signing request cannot be updated in its current state.',
  },
} satisfies Record<
  GetPublicSigningSessionErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
