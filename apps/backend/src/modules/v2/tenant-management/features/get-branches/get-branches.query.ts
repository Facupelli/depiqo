export class GetBranchesQuery {
  constructor(
    public readonly tenantId: string,
    public readonly isActive?: boolean,
  ) {}
}
