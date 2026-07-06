import { Controller, Get, Headers, Res, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Response } from 'express';
import { Result } from 'neverthrow';

import { AUTH_ACTOR_TYPES } from 'src/modules/tenant-management/auth/shared/auth.types';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantCustomerSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-customer-session.guard';

import { extractBearerToken } from '../../application/signing-bearer-token';
import { StreamPublicUnsignedDocumentResult } from './stream-public-unsigned-document.result';
import { mapStreamPublicUnsignedDocumentHttpError } from './stream-public-unsigned-document-http.mapper';
import { StreamPublicUnsignedDocumentQuery } from './stream-public-unsigned-document.query';
import { StreamPublicUnsignedDocumentQueryError } from './stream-public-unsigned-document.service';

@Controller('document-signing/public/sessions')
export class StreamPublicUnsignedDocumentHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('me/unsigned-pdf')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_CUSTOMER)
  @UseGuards(SessionAuthGuard, TenantCustomerSessionGuard)
  async streamUnsignedPdf(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.queryBus.execute<
      StreamPublicUnsignedDocumentQuery,
      Result<StreamPublicUnsignedDocumentResult, StreamPublicUnsignedDocumentQueryError>
    >(new StreamPublicUnsignedDocumentQuery(extractBearerToken(authorizationHeader)));

    if (result.isErr()) {
      throw mapStreamPublicUnsignedDocumentHttpError(result.error);
    }

    response.setHeader('Content-Type', result.value.contentType);
    response.setHeader('Content-Length', String(result.value.byteSize));
    response.setHeader('Content-Disposition', `inline; filename="${sanitizeHeaderFileName(result.value.fileName)}"`);

    result.value.stream.pipe(response);
  }
}

function sanitizeHeaderFileName(fileName: string): string {
  return fileName.replace(/["\r\n]/g, '');
}
