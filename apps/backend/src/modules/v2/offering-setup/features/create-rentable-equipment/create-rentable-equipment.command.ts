import { RentableItemKind } from '../../../catalog/public-api/catalog.public-api';

export interface CreateRentableEquipmentAssetInput {
  branchId: string;
  serialNumber?: string | null;
  notes?: string | null;
  ownerId?: string | null;
}

export class CreateRentableEquipmentCommand {
  public readonly tenantId: string;
  public readonly name: string;
  public readonly description?: string | null;
  public readonly imageUrl?: string | null;
  public readonly categoryId?: string | null;
  public readonly kind: RentableItemKind;
  public readonly quantityPerItem: number;
  public readonly assets: CreateRentableEquipmentAssetInput[];

  constructor(props: {
    tenantId: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    categoryId?: string | null;
    kind: RentableItemKind;
    quantityPerItem: number;
    assets?: CreateRentableEquipmentAssetInput[];
  }) {
    this.tenantId = props.tenantId;
    this.name = props.name;
    this.description = props.description;
    this.imageUrl = props.imageUrl;
    this.categoryId = props.categoryId;
    this.kind = props.kind;
    this.quantityPerItem = props.quantityPerItem;
    this.assets = props.assets ?? [];
  }
}
