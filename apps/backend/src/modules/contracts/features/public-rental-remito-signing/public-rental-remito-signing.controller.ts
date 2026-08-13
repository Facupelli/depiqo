import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

import { Public } from 'src/core/decorators/public.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import {
  AcceptPublicSigningSessionBodyDto,
  AcceptPublicSigningSessionResponseDto,
  PublicSigningSessionResolveResponseDto,
  PublicSigningSessionResponseDto,
  ResolvePublicSigningSessionQueryDto,
  StreamPublicSignedDocumentQueryDto,
} from './public-rental-remito-signing.dto';
import { PublicRentalRemitoSigningError } from './public-rental-remito-signing.errors';
import { PublicRentalRemitoSigningService } from './public-rental-remito-signing.service';

@Public()
@Controller('document-signing/public')
export class PublicRentalRemitoSigningHttpController {
  constructor(private readonly signing: PublicRentalRemitoSigningService) {}

  @Get('sessions/resolve')
  async resolve(@Query() query: ResolvePublicSigningSessionQueryDto): Promise<PublicSigningSessionResolveResponseDto> {
    const result = await this.signing.resolve(query.token);
    if (result.isErr()) throw toPublicSigningProblem(result.error);
    return result.value;
  }

  @Get('sessions/me')
  async getSession(@Headers('authorization') authorization?: string): Promise<PublicSigningSessionResponseDto> {
    const result = await this.signing.getSession(extractBearerToken(authorization));
    if (result.isErr()) throw toPublicSigningProblem(result.error);
    const request = result.value;
    return {
      requestId: request.id,
      documentType: 'RENTAL_AGREEMENT',
      status: request.status,
      expiresAt: request.expiresAt.toISOString(),
      signedAt: null,
      document: {
        documentNumber: request.contract.documentNumber,
        displayFileName: request.unsignedArtifact.fileName,
        contentType: request.unsignedArtifact.contentType,
        byteSize: request.unsignedArtifact.byteSize,
        sha256: request.unsignedArtifact.documentHash,
        hashAlgorithm: 'SHA-256',
      },
      signer: { name: request.signerName, email: request.signerEmail, phone: request.signerPhone },
      acceptance: { textVersion: request.acceptanceText.version, textSnapshot: request.acceptanceText.text },
    };
  }

  @Get('sessions/me/unsigned-pdf')
  async streamUnsignedPdf(
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.signing.streamUnsigned(extractBearerToken(authorization));
    if (result.isErr()) throw toPublicSigningProblem(result.error);
    const document = result.value;
    res.set({
      'Content-Type': document.contentType,
      'Content-Disposition': `inline; filename="${document.fileName}"`,
      'Content-Length': document.byteSize,
    });
    document.stream.pipe(res);
  }

  @Post('sessions/me/accept')
  @HttpCode(HttpStatus.OK)
  async accept(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: AcceptPublicSigningSessionBodyDto,
    @Req() request: Request,
  ): Promise<AcceptPublicSigningSessionResponseDto> {
    const result = await this.signing.accept({
      rawToken: extractBearerToken(authorization),
      signatureImageDataUrl: body.signatureImageDataUrl,
      acceptanceTextVersion: body.acceptanceTextVersion,
      accepted: body.accepted,
      acceptedIpAddress: request.ip ?? null,
      acceptedUserAgent: request.get('user-agent') ?? null,
    });
    if (result.isErr()) throw toPublicSigningProblem(result.error, { signingAction: true });
    return {
      requestId: result.value.requestId,
      status: 'SIGNED',
      signedAt: result.value.signedAt.toISOString(),
      downloadUrl: `/document-signing/public/receipts/signed-pdf?token=${encodeURIComponent(result.value.receiptToken)}`,
      receiptTokenExpiresAt: result.value.receiptTokenExpiresAt.toISOString(),
    };
  }

  @Get('receipts/signed-pdf')
  async streamSignedPdf(@Query() query: StreamPublicSignedDocumentQueryDto, @Res() res: Response): Promise<void> {
    const result = await this.signing.streamSigned(query.token ?? '');
    if (result.isErr()) throw toPublicSigningProblem(result.error);
    const document = result.value;
    res.set({
      'Content-Type': document.contentType,
      'Content-Disposition': `attachment; filename="${document.fileName}"`,
      'Content-Length': document.byteSize,
    });
    document.stream.pipe(res);
  }
}

function extractBearerToken(authorization?: string): string {
  const [scheme, token] = authorization?.trim().split(/\s+/, 2) ?? [];
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw ProblemException.from({
      problemDetails: createProblemDetails({
        type: createProblemType('document-signing/signing-token-required'),
        title: 'Signing token required',
        status: HttpStatus.UNAUTHORIZED,
        detail: 'Authorization header must contain a Bearer signing token.',
        extensions: { code: 'document_signing.signing_token_required' },
      }),
      applicationError: {
        code: 'document_signing.signing_token_required',
        message: 'Authorization header must contain a Bearer signing token.',
      },
    });
  }
  return token;
}

function toPublicSigningProblem(
  error: PublicRentalRemitoSigningError,
  options?: { signingAction?: boolean },
): ProblemException {
  const problem = publicSigningProblemMap[error.code];
  const detail =
    error.code === 'SigningRequestUnavailable' && options?.signingAction
      ? 'The signing request is not available for signing.'
      : problem.detail;
  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail,
      extensions: { code: problem.code },
    }),
    applicationError: { code: problem.code, message: error.message },
  });
}

const publicSigningProblemMap = {
  SigningTokenNotFound: {
    code: 'document_signing.signing_token_not_found',
    type: createProblemType('document-signing/signing-token-not-found'),
    title: 'Signing token not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The signing session could not be found for the provided token.',
  },
  SigningRequestExpired: {
    code: 'document_signing.signing_request_expired',
    type: createProblemType('document-signing/signing-request-expired'),
    title: 'Signing request expired',
    status: HttpStatus.GONE,
    detail: 'The signing request has expired.',
  },
  SigningRequestUnavailable: {
    code: 'document_signing.signing_request_unavailable',
    type: createProblemType('document-signing/signing-request-unavailable'),
    title: 'Signing request unavailable',
    status: HttpStatus.CONFLICT,
    detail: 'The signing request is not available for this action.',
  },
  ReceiptTokenNotFound: {
    code: 'document_signing.receipt_token_not_found',
    type: createProblemType('document-signing/receipt-token-not-found'),
    title: 'Receipt token not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The signed document receipt could not be found for the provided token.',
  },
  ReceiptTokenExpired: {
    code: 'document_signing.receipt_token_expired',
    type: createProblemType('document-signing/receipt-token-expired'),
    title: 'Receipt token expired',
    status: HttpStatus.GONE,
    detail: 'The signed document receipt token has expired.',
  },
  ReceiptTokenUnavailable: {
    code: 'document_signing.signed_document_unavailable',
    type: createProblemType('document-signing/signed-document-unavailable'),
    title: 'Signed document unavailable',
    status: HttpStatus.CONFLICT,
    detail: 'The signed document is not available for this signing request.',
  },
  AcceptanceConfirmationRequired: {
    code: 'document_signing.acceptance_confirmation_required',
    type: createProblemType('document-signing/acceptance-confirmation-required'),
    title: 'Acceptance confirmation required',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Signing acceptance requires explicit confirmation from the signer.',
  },
} satisfies Record<
  PublicRentalRemitoSigningError['code'],
  { code: string; type: string; title: string; status: HttpStatus; detail: string }
>;
