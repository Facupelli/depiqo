export class RegisterCustomDomainCommand {
  constructor(
    public readonly tenantId: string,
    public readonly domain: string,
  ) {}
}
