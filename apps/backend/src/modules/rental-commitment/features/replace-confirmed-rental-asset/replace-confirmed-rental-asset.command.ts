import { AssetId } from '../../domain/types/rental-commitment-ids';

export class ReplaceConfirmedRentalAssetCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      tenantUserId: string;
      rentalId: string;
      expectedUpdatedAt: Date;
      currentAssignedAssetId: AssetId;
      replacementAssetId: AssetId;
    },
  ) {}
}
