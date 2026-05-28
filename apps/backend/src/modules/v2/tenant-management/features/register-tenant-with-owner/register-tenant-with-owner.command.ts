export class RegisterTenantWithOwnerCommand {
  constructor(
    public readonly tenantName: string,
    public readonly ownerName: string,
    public readonly ownerEmail: string,
    public readonly ownerPassword: string,
  ) {}
}
