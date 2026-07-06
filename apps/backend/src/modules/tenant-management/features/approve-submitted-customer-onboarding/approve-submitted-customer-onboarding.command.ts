export class ApproveSubmittedCustomerOnboardingCommand {
  constructor(
    public readonly tenantId: string,
    public readonly customerId: string,
    public readonly reviewedById: string,
  ) {}
}
