import { Module } from '@nestjs/common';

import { GetOrderSigningSummaryQueryHandler } from './features/get-order-signing-summary/get-order-signing-summary.query-handler';
import { GetLatestSignedOrderSigningRequestQueryHandler } from './features/get-latest-signed-order-signing-request/get-latest-signed-order-signing-request.query-handler';

import { DocumentSigningRequestRepository } from './infrastructure/persistence/repositories/document-signing-request.repository';

@Module({
  providers: [
    DocumentSigningRequestRepository,
    GetLatestSignedOrderSigningRequestQueryHandler,
    GetOrderSigningSummaryQueryHandler,
  ],
})
export class DocumentSigningModule {}
