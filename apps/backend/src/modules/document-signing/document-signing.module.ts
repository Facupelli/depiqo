import { Module } from '@nestjs/common';

import { ContractsModule } from '../contracts/contracts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TenantManagementModule } from '../tenant-management/tenant-management.module';

import { AcceptPublicSigningSessionHttpController } from './features/accept-public-signing-session/accept-public-signing-session.http.controller';
import { AcceptPublicSigningSessionService } from './features/accept-public-signing-session/accept-public-signing-session.service';
import { SendSigningInvitationHttpController } from './features/send-signing-invitation/send-signing-invitation.http.controller';
import { SendSigningInvitationService } from './features/send-signing-invitation/send-signing-invitation.service';
import { GetPublicSigningSessionQueryHandler } from './features/get-public-signing-session/get-public-signing-session.query-handler';
import { GetOrderSigningSummaryQueryHandler } from './features/get-order-signing-summary/get-order-signing-summary.query-handler';
import { GetLatestSignedOrderSigningRequestQueryHandler } from './features/get-latest-signed-order-signing-request/get-latest-signed-order-signing-request.query-handler';
import { GetPublicSigningSessionHttpController } from './features/get-public-signing-session/get-public-signing-session.http.controller';
import { ResolvePublicSigningSessionQueryHandler } from './features/resolve-public-signing-session/resolve-public-signing-session.query-handler';
import { PublicV2SigningSessionLoader } from './application/public-v2-signing-session.loader';
import { SigningNotificationService } from './application/services/signing-notification.service';
import { StreamPublicSignedDocumentHttpController } from './features/stream-public-signed-document/stream-public-signed-document.controller';
import { StreamPublicSignedDocumentService } from './features/stream-public-signed-document/stream-public-signed-document.service';
import { StreamPublicUnsignedDocumentService } from './features/stream-public-unsigned-document/stream-public-unsigned-document.service';

import { DocumentSigningRequestRepository } from './infrastructure/persistence/repositories/document-signing-request.repository';

@Module({
  imports: [ContractsModule, NotificationsModule, TenantManagementModule],
  controllers: [
    SendSigningInvitationHttpController,
    GetPublicSigningSessionHttpController,
    AcceptPublicSigningSessionHttpController,
    StreamPublicSignedDocumentHttpController,
  ],
  providers: [
    DocumentSigningRequestRepository,
    PublicV2SigningSessionLoader,
    SigningNotificationService,
    StreamPublicSignedDocumentService,
    ResolvePublicSigningSessionQueryHandler,
    GetLatestSignedOrderSigningRequestQueryHandler,
    GetPublicSigningSessionQueryHandler,
    StreamPublicUnsignedDocumentService,
    GetOrderSigningSummaryQueryHandler,
    AcceptPublicSigningSessionService,
    SendSigningInvitationService,
  ],
})
export class DocumentSigningModule {}
