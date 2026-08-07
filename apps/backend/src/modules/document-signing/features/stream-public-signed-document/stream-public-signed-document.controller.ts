import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';

import { Public } from 'src/core/decorators/public.decorator';
import { toPublicSigningSessionProblem } from '../../application/public-signing-session.http-errors';

import { StreamPublicSignedDocumentQueryDto } from './stream-public-signed-document.request.dto';
import { StreamPublicSignedDocumentService } from './stream-public-signed-document.service';

@Public()
@Controller('document-signing/public/receipts')
export class StreamPublicSignedDocumentHttpController {
  constructor(private readonly streamPublicSignedDocumentService: StreamPublicSignedDocumentService) {}

  @Get('signed-pdf')
  async streamSignedPdf(@Query() query: StreamPublicSignedDocumentQueryDto, @Res() res: Response): Promise<void> {
    const result = await this.streamPublicSignedDocumentService.stream(query.token ?? '');
    if (result.isErr()) throw toPublicSigningSessionProblem(result.error);

    const document = result.value;
    res.set({
      'Content-Type': document.contentType,
      'Content-Disposition': `attachment; filename="${document.fileName}"`,
      'Content-Length': document.contentLength,
    });
    document.stream.pipe(res);
  }
}
