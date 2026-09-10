import { ICommand } from '@nestjs/cqrs';

type CreateIndividualRentalProps = {
  tenantId: string;
  equipmentTypeId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  branchIds: string[];
};

export class CreateIndividualRentalCommand implements ICommand {
  public readonly tenantId: string;
  public readonly equipmentTypeId: string;
  public readonly name: string;
  public readonly description?: string | null;
  public readonly imageUrl?: string | null;
  public readonly categoryId?: string | null;
  public readonly branchIds: string[];

  constructor(props: CreateIndividualRentalProps) {
    this.tenantId = props.tenantId;
    this.equipmentTypeId = props.equipmentTypeId;
    this.name = props.name;
    this.description = props.description;
    this.imageUrl = props.imageUrl;
    this.categoryId = props.categoryId;
    this.branchIds = props.branchIds;
  }
}
