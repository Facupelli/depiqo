export class RejectSubmittedCustomerOnboardingCommand {
  constructor(
    public readonly tenantId: string,
    public readonly customerId: string,
    public readonly reviewedById: string,
    public readonly rejectionReason: string,
  ) {}
}
