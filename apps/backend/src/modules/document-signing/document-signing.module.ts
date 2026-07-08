import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { ObjectStorageModule } from '../object-storage/object-storage.module';

import { AcceptPublicSigningSessionHttpController } from './application/commands/accept-public-signing-session/accept-public-signing-session.http.controller';
import { AcceptPublicSigningSessionService } from './application/commands/accept-public-signing-session/accept-public-signing-session.service';
import { SendSigningInvitationHttpController } from './application/commands/send-signing-invitation/send-signing-invitation.http.controller';
import { SendSigningInvitationService } from './application/commands/send-signing-invitation/send-signing-invitation.service';
import { GetPublicSigningSessionQueryHandler } from './application/queries/get-public-signing-session/get-public-signing-session.query-handler';
import { GetOrderSigningSummaryQueryHandler } from './application/queries/get-order-signing-summary/get-order-signing-summary.query-handler';
import { GetLatestSignedOrderSigningRequestQueryHandler } from './application/queries/get-latest-signed-order-signing-request/get-latest-signed-order-signing-request.query-handler';
import { GetPublicSigningSessionHttpController } from './application/queries/get-public-signing-session/get-public-signing-session.http.controller';
import { ResolvePublicSigningSessionQueryHandler } from './application/queries/resolve-public-signing-session/resolve-public-signing-session.query-handler';
import { PublicSigningSessionLoader } from './application/public-signing-session.loader';
import { SigningNotificationService } from './application/services/signing-notification.service';
import { SigningRequestPdfStorageService } from './application/services/signing-request-pdf-storage.service';
import { StreamPublicSignedDocumentService } from './application/services/stream-public-signed-document.service';
import { StreamPublicUnsignedDocumentService } from './application/services/stream-public-unsigned-document.service';

import { DocumentSigningRequestRepository } from './infrastructure/persistence/repositories/document-signing-request.repository';

@Module({
  imports: [NotificationsModule, ObjectStorageModule],
  controllers: [
    SendSigningInvitationHttpController,
    GetPublicSigningSessionHttpController,
    AcceptPublicSigningSessionHttpController,
  ],
  providers: [
    DocumentSigningRequestRepository,
    PublicSigningSessionLoader,
    SigningNotificationService,
    SigningRequestPdfStorageService,
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
