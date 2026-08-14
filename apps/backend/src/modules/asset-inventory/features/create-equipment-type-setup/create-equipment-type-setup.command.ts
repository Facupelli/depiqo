export interface CreateEquipmentTypeSetupAssetInput {
  branchId: string;
  serialNumber?: string | null;
  notes?: string | null;
  ownerId?: string | null;
}

export class CreateEquipmentTypeSetupCommand {
  public readonly tenantId: string;
  public readonly name: string;
  public readonly description?: string | null;
  public readonly categoryId?: string | null;
  public readonly assets: CreateEquipmentTypeSetupAssetInput[];

  constructor(props: {
    tenantId: string;
    name: string;
    description?: string | null;
    categoryId?: string | null;
    assets?: CreateEquipmentTypeSetupAssetInput[];
  }) {
    this.tenantId = props.tenantId;
    this.name = props.name;
    this.description = props.description;
    this.categoryId = props.categoryId;
    this.assets = props.assets ?? [];
  }
}
