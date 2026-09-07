export interface CreateEquipmentDetailsInput {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
}

export interface CreateEquipmentAssetInput {
  branchId: string;
  serialNumber?: string | null;
  notes?: string | null;
  ownerId?: string | null;
}

export interface CreateEquipmentStandaloneRentalInput {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  branchIds: string[];
}

export class CreateEquipmentCommand {
  public readonly tenantId: string;
  public readonly equipment: CreateEquipmentDetailsInput;
  public readonly assets: CreateEquipmentAssetInput[];
  public readonly standaloneRental?: CreateEquipmentStandaloneRentalInput;

  constructor(props: {
    tenantId: string;
    equipment: CreateEquipmentDetailsInput;
    assets?: CreateEquipmentAssetInput[];
    standaloneRental?: CreateEquipmentStandaloneRentalInput;
  }) {
    this.tenantId = props.tenantId;
    this.equipment = props.equipment;
    this.assets = props.assets ?? [];
    this.standaloneRental = props.standaloneRental;
  }
}
