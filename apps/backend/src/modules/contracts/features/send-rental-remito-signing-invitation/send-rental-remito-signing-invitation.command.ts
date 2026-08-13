import { SigningDocumentType } from 'src/generated/prisma/client';

export class SendRentalRemitoSigningInvitationCommand {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly documentType: SigningDocumentType,
    public readonly recipientEmail?: string,
  ) {}
}
