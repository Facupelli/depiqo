import { Controller, Get, Query, Res } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Response } from 'express';
import { Result } from 'neverthrow';

import {
  toStreamPublicSignedReceiptDocumentApplicationError,
  toStreamPublicSignedReceiptDocumentProblem,
} from './stream-public-signed-receipt-document-http.mapper';
import { StreamPublicSignedReceiptDocumentResult } from './stream-public-signed-receipt-document.result';
import { StreamPublicSignedReceiptDocumentQuery } from './stream-public-signed-receipt-document.query';
import { StreamPublicSignedReceiptDocumentQueryDto } from './stream-public-signed-receipt-document.request.dto';
import { StreamPublicSignedReceiptDocumentQueryError } from './stream-public-signed-receipt-document.service';

@Controller('v2/document-signing/public/receipts')
export class StreamPublicSignedReceiptDocumentHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('signed-pdf')
  async streamSignedPdf(
    @Query() query: StreamPublicSignedReceiptDocumentQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.queryBus.execute<
      StreamPublicSignedReceiptDocumentQuery,
      Result<StreamPublicSignedReceiptDocumentResult, StreamPublicSignedReceiptDocumentQueryError>
    >(new StreamPublicSignedReceiptDocumentQuery(query.token));

    if (result.isErr()) {
      throw toStreamPublicSignedReceiptDocumentProblem(
        toStreamPublicSignedReceiptDocumentApplicationError(result.error),
      );
    }

    response.setHeader('Content-Type', result.value.contentType);
    response.setHeader('Content-Length', String(result.value.byteSize));
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${sanitizeHeaderFileName(result.value.fileName)}"`,
    );

    result.value.stream.pipe(response);
  }
}

function sanitizeHeaderFileName(fileName: string): string {
  return fileName.replace(/["\r\n]/g, '');
}
