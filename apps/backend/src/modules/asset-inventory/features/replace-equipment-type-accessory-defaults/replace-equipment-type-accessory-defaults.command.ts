export interface ReplaceEquipmentTypeAccessoryDefaultInput {
  accessoryEquipmentTypeId: string;
  quantity: number;
}

export class ReplaceEquipmentTypeAccessoryDefaultsCommand {
  readonly tenantId: string;
  readonly equipmentTypeId: string;
  readonly accessories: ReplaceEquipmentTypeAccessoryDefaultInput[];

  constructor(props: {
    tenantId: string;
    equipmentTypeId: string;
    accessories: ReplaceEquipmentTypeAccessoryDefaultInput[];
  }) {
    this.tenantId = props.tenantId;
    this.equipmentTypeId = props.equipmentTypeId;
    this.accessories = props.accessories;
  }
}
