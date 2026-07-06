export interface CreateEquipmentTypeAssetInput {
  branchId: string;
  serialNumber?: string | null;
  notes?: string | null;
  ownerId?: string | null;
}

export class CreateEquipmentTypeCommand {
  public readonly tenantId: string;
  public readonly name: string;
  public readonly description?: string | null;
  public readonly assets: CreateEquipmentTypeAssetInput[];

  constructor(props: {
    tenantId: string;
    name: string;
    description?: string | null;
    assets?: CreateEquipmentTypeAssetInput[];
  }) {
    this.tenantId = props.tenantId;
    this.name = props.name;
    this.description = props.description;
    this.assets = props.assets ?? [];
  }
}
