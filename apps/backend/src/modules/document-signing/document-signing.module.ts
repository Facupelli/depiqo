import { Module } from '@nestjs/common';

import { NotificationsModule } from 'src/modules/notifications/notifications.module';
import { ObjectStorageModule } from 'src/modules/object-storage/object-storage.module';

import { ContractsModule } from '../contracts/contracts.module';
import { TenantManagementModule } from '../tenant-management/tenant-management.module';
import { PublicSigningSessionLoader } from './application/public-signing-session.loader';
import { SigningAcceptanceTextService } from './application/signing-acceptance-text.service';
import { SigningNotificationService } from './application/signing-notification.service';
import { SigningPdfStorageService } from './application/signing-pdf-storage.service';
import { SigningTokenService } from './application/signing-token.service';
import { AcceptPublicSigningSessionHttpController } from './features/accept-public-signing-session/accept-public-signing-session.http.controller';
import { AcceptPublicSigningSessionService } from './features/accept-public-signing-session/accept-public-signing-session.service';
import { GetPublicSigningSessionHttpController } from './features/get-public-signing-session/get-public-signing-session.http.controller';
import { GetPublicSigningSessionService } from './features/get-public-signing-session/get-public-signing-session.service';
import { ResolvePublicSigningSessionHttpController } from './features/resolve-public-signing-session/resolve-public-signing-session.http.controller';
import { ResolvePublicSigningSessionService } from './features/resolve-public-signing-session/resolve-public-signing-session.service';
import { SendSigningInvitationHttpController } from './features/send-signing-invitation/send-signing-invitation.http.controller';
import { SendSigningInvitationService } from './features/send-signing-invitation/send-signing-invitation.service';
import { StreamPublicUnsignedDocumentHttpController } from './features/stream-public-unsigned-document/stream-public-unsigned-document.http.controller';
import { StreamPublicUnsignedDocumentService } from './features/stream-public-unsigned-document/stream-public-unsigned-document.service';
import { SigningReceiptTokenService } from './application/signing-receipt-token.service';
import { SigningReceiptUrlService } from './application/signing-receipt-url.service';
import { StreamPublicSignedReceiptDocumentHttpController } from './features/stream-public-signed-receipt-document/stream-public-signed-receipt-document.http.controller';
import { StreamPublicSignedReceiptDocumentService } from './features/stream-public-signed-receipt-document/stream-public-signed-receipt-document.service';

@Module({
  imports: [NotificationsModule, ObjectStorageModule, ContractsModule, TenantManagementModule],
  controllers: [
    SendSigningInvitationHttpController,
    ResolvePublicSigningSessionHttpController,
    GetPublicSigningSessionHttpController,
    StreamPublicUnsignedDocumentHttpController,
    AcceptPublicSigningSessionHttpController,
    StreamPublicSignedReceiptDocumentHttpController,
  ],
  providers: [
    PublicSigningSessionLoader,
    SigningAcceptanceTextService,
    SigningNotificationService,
    SigningPdfStorageService,
    SigningReceiptTokenService,
    SigningReceiptUrlService,
    SigningTokenService,
    SendSigningInvitationService,
    ResolvePublicSigningSessionService,
    GetPublicSigningSessionService,
    StreamPublicUnsignedDocumentService,
    AcceptPublicSigningSessionService,
    StreamPublicSignedReceiptDocumentService,
  ],
})
export class DocumentSigningModule {}
