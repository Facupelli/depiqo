export interface AddAssetsToEquipmentTypeAssetInput {
  branchId: string;
  serialNumber?: string | null;
  notes?: string | null;
  ownerId?: string | null;
}

export class AddAssetsToEquipmentTypeCommand {
  public readonly tenantId: string;
  public readonly equipmentTypeId: string;
  public readonly assets: AddAssetsToEquipmentTypeAssetInput[];

  constructor(props: { tenantId: string; equipmentTypeId: string; assets: AddAssetsToEquipmentTypeAssetInput[] }) {
    this.tenantId = props.tenantId;
    this.equipmentTypeId = props.equipmentTypeId;
    this.assets = props.assets;
  }
}
