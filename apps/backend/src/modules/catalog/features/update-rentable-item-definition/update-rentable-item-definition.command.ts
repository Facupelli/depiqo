import { RentableItemKind } from '../../domain/rentable-item.aggregate';

export class UpdateRentableItemDefinitionCommand {
  constructor(
    public readonly tenantId: string,
    public readonly rentableItemId: string,
    public readonly props: {
      name?: string;
      description?: string | null;
      imageUrl?: string | null;
      categoryId?: string | null;
      kind?: RentableItemKind;
      requirements?: Array<{ equipmentTypeId: string; quantityPerItem: number }>;
    },
  ) {}
}
