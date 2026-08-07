import { Module } from '@nestjs/common';

import { GenerateRentalRemitoHttpController } from './features/generate-rental-remito/generate-rental-remito.controller';
import { GenerateRentalRemitoHandler } from './features/generate-rental-remito/generate-rental-remito.handler';
import { GetRentalContractSigningSummaryHttpController } from './features/get-rental-contract-signing-summary/get-rental-contract-signing-summary.controller';
import { GetRentalContractSigningSummaryHandler } from './features/get-rental-contract-signing-summary/get-rental-contract-signing-summary.handler';
import { PrepareRentalRemitoForSigningHandler } from './features/prepare-rental-remito-for-signing/prepare-rental-remito-for-signing.handler';

import { RentalRemitoDocumentService } from './application/rental-remito/rental-remito-document.service';
import { RentalRemitoReadModelLoader } from './application/rental-remito/rental-remito-read-model.loader';
import { RentalRemitoViewModelMapper } from './application/rental-remito/rental-remito-view-model.mapper';

import { RentalRemitoRendererPort } from './domain/ports/rental-remito-renderer.port';
import { ReactPdfRentalRemitoRendererAdapter } from './infrastructure/pdf/react-pdf-rental-remito-renderer.adapter';
import { RentalRemitoContractWriterService } from './application/rental-remito/rental-remito-contract-writer.service';
import { V2ContractsPublicApi } from './public-api/contracts.public-api';
import { V2ContractsPublicApiService } from './public-api/contracts.public-api.service';
import { RentalRemitoContractStateService } from './application/rental-remito/rental-remito-contract-state.service';

@Module({
  controllers: [GenerateRentalRemitoHttpController, GetRentalContractSigningSummaryHttpController],
  providers: [
    GenerateRentalRemitoHandler,
    GetRentalContractSigningSummaryHandler,
    PrepareRentalRemitoForSigningHandler,
    RentalRemitoDocumentService,
    RentalRemitoReadModelLoader,
    RentalRemitoViewModelMapper,
    RentalRemitoContractWriterService,
    RentalRemitoContractStateService,
    {
      provide: RentalRemitoRendererPort,
      useClass: ReactPdfRentalRemitoRendererAdapter,
    },
    {
      provide: V2ContractsPublicApi,
      useClass: V2ContractsPublicApiService,
    },
  ],
  exports: [V2ContractsPublicApi],
})
export class ContractsModule {}
