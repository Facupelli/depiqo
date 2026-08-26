export type AssignRentalAccessoryInput = {
  sourceRentalDemandLineId?: string;
  equipmentTypeId: string;
  quantity: number;
};

export class AssignRentalAccessoriesCommand {
  public readonly tenantId: string;
  public readonly rentalId: string;
  public readonly accessories: AssignRentalAccessoryInput[];

  constructor(props: { tenantId: string; rentalId: string; accessories: AssignRentalAccessoryInput[] }) {
    this.tenantId = props.tenantId;
    this.rentalId = props.rentalId;
    this.accessories = props.accessories;
  }
}
