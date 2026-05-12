export class RejectOrderCommand {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
    public readonly reviewedByUserId: string,
    public readonly rejectionReason: string | null,
  ) {}
}
