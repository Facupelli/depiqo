export interface CreatePackageRequirementInput {
  equipmentTypeId: string;
  quantityPerItem: number;
}

export class CreatePackageCommand {
  public readonly tenantId: string;
  public readonly name: string;
  public readonly description?: string | null;
  public readonly imageUrl?: string | null;
  public readonly categoryId?: string | null;
  public readonly branchIds: string[];
  public readonly requirements: CreatePackageRequirementInput[];

  constructor(props: {
    tenantId: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    categoryId?: string | null;
    branchIds: string[];
    requirements: CreatePackageRequirementInput[];
  }) {
    this.tenantId = props.tenantId;
    this.name = props.name;
    this.description = props.description;
    this.imageUrl = props.imageUrl;
    this.categoryId = props.categoryId;
    this.branchIds = props.branchIds;
    this.requirements = props.requirements;
  }
}
