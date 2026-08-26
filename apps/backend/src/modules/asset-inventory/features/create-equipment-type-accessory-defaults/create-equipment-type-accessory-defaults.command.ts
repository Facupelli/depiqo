export interface CreateEquipmentTypeAccessoryDefaultInput {
  accessoryEquipmentTypeId: string;
  quantity: number;
}

export class CreateEquipmentTypeAccessoryDefaultsCommand {
  readonly tenantId: string;
  readonly equipmentTypeId: string;
  readonly accessories: CreateEquipmentTypeAccessoryDefaultInput[];

  constructor(props: {
    tenantId: string;
    equipmentTypeId: string;
    accessories: CreateEquipmentTypeAccessoryDefaultInput[];
  }) {
    this.tenantId = props.tenantId;
    this.equipmentTypeId = props.equipmentTypeId;
    this.accessories = props.accessories;
  }
}
