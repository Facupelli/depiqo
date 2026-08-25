export class GetReplacementAssetCandidatesQuery {
  constructor(
    public readonly tenantId: string,
    public readonly rentalId: string,
    public readonly currentAssignedAssetId: string,
  ) {}
}
