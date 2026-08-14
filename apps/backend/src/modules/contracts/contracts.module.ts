import { Module } from '@nestjs/common';

import { AssetInventoryModule } from '../asset-inventory/asset-inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ObjectStorageModule } from '../object-storage/object-storage.module';
import { RentalCommitmentModule } from '../rental-commitment/rental-commitment.module';
import { TenantManagementModule } from '../tenant-management/tenant-management.module';
import { GenerateRentalBudgetHttpController } from './features/generate-rental-budget/generate-rental-budget.controller';
import { GenerateRentalBudgetHandler } from './features/generate-rental-budget/generate-rental-budget.handler';
import { GenerateRentalRemitoHttpController } from './features/generate-rental-remito/generate-rental-remito.controller';
import { GenerateRentalRemitoHandler } from './features/generate-rental-remito/generate-rental-remito.handler';
import { GetRentalContractSigningSummaryHttpController } from './features/get-rental-contract-signing-summary/get-rental-contract-signing-summary.controller';
import { GetRentalContractSigningSummaryHandler } from './features/get-rental-contract-signing-summary/get-rental-contract-signing-summary.handler';
import { PrepareRentalRemitoForSigningHandler } from './features/prepare-rental-remito-for-signing/prepare-rental-remito-for-signing.handler';

import { RentalBudgetDocumentService } from './application/rental-budget/rental-budget-document.service';
import { RentalRemitoDocumentService } from './application/rental-remito/rental-remito-document.service';
import { RentalRemitoReadModelLoader } from './application/rental-remito/rental-remito-read-model.loader';
import { RentalRemitoViewModelMapper } from './application/rental-remito/rental-remito-view-model.mapper';

import { RentalRemitoRendererPort } from './domain/ports/rental-remito-renderer.port';
import { ReactPdfRentalRemitoRendererAdapter } from './infrastructure/pdf/react-pdf-rental-remito-renderer.adapter';
import { RentalRemitoContractWriterService } from './application/rental-remito/rental-remito-contract-writer.service';
import { RentalRemitoContractStateService } from './application/rental-remito/rental-remito-contract-state.service';
import { ContractArtifactPersistenceService } from './application/contract-artifact-persistence.service';
import { RentalRemitoSignedArtifactService } from './application/rental-remito/rental-remito-signed-artifact.service';
import { RentalRemitoSigningNotificationService } from './application/rental-remito/rental-remito-signing-notification.service';
import { RentalRemitoSigningRequestService } from './application/rental-remito/rental-remito-signing-request.service';
import { HandleConfirmedRentalEditedEventHandler } from './application/event-handlers/handle-confirmed-rental-edited.event-handler';
import { PublicRentalRemitoSigningHttpController } from './features/public-rental-remito-signing/public-rental-remito-signing.controller';
import { PublicRentalRemitoSigningService } from './features/public-rental-remito-signing/public-rental-remito-signing.service';
import { SendRentalRemitoSigningInvitationHttpController } from './features/send-rental-remito-signing-invitation/send-rental-remito-signing-invitation.http.controller';
import { SendRentalRemitoSigningInvitationService } from './features/send-rental-remito-signing-invitation/send-rental-remito-signing-invitation.service';

@Module({
  imports: [
    AssetInventoryModule,
    NotificationsModule,
    ObjectStorageModule,
    RentalCommitmentModule,
    TenantManagementModule,
  ],
  controllers: [
    GenerateRentalBudgetHttpController,
    GenerateRentalRemitoHttpController,
    GetRentalContractSigningSummaryHttpController,
    PublicRentalRemitoSigningHttpController,
    SendRentalRemitoSigningInvitationHttpController,
  ],
  providers: [
    GenerateRentalBudgetHandler,
    GenerateRentalRemitoHandler,
    GetRentalContractSigningSummaryHandler,
    PrepareRentalRemitoForSigningHandler,
    RentalBudgetDocumentService,
    RentalRemitoDocumentService,
    RentalRemitoReadModelLoader,
    RentalRemitoViewModelMapper,
    RentalRemitoContractWriterService,
    RentalRemitoContractStateService,
    ContractArtifactPersistenceService,
    RentalRemitoSignedArtifactService,
    RentalRemitoSigningNotificationService,
    RentalRemitoSigningRequestService,
    HandleConfirmedRentalEditedEventHandler,
    PublicRentalRemitoSigningService,
    SendRentalRemitoSigningInvitationService,
    {
      provide: RentalRemitoRendererPort,
      useClass: ReactPdfRentalRemitoRendererAdapter,
    },
  ],
})
export class ContractsModule {}
