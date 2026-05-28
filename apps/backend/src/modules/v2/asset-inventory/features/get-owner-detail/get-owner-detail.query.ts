export class GetOwnerDetailQuery {
  constructor(
    public readonly tenantId: string,
    public readonly ownerId: string,
  ) {}
}
