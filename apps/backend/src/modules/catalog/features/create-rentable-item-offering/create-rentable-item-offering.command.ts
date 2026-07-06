import { ICommand } from '@nestjs/cqrs';

import { RentableItemKind } from '../../domain/rentable-item.aggregate';

type CreateRentableItemOfferingProps = {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  kind: RentableItemKind;
  requirements: Array<{
    equipmentTypeId: string;
    quantityPerItem: number;
  }>;
  branchIds: string[];
};

export class CreateRentableItemOfferingCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly props: CreateRentableItemOfferingProps,
  ) {}
}
