export class SendRentalRemitoSigningInvitationCommand {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly recipientEmail?: string,
  ) {}
}
