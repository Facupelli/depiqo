export type AssignRentalAccessoryInput = {
  sourceRentalDemandLineId?: string;
  equipmentTypeId: string;
  quantity: number;
};

export class AssignRentalAccessoriesCommand {
  public readonly tenantId: string;
  public readonly rentalId: string;
  public readonly expectedVersion: number;
  public readonly accessories: AssignRentalAccessoryInput[];

  constructor(props: {
    tenantId: string;
    rentalId: string;
    expectedVersion: number;
    accessories: AssignRentalAccessoryInput[];
  }) {
    this.tenantId = props.tenantId;
    this.rentalId = props.rentalId;
    this.expectedVersion = props.expectedVersion;
    this.accessories = props.accessories;
  }
}
