import { RentalItemKind, TrackingMode } from '@repo/types';

type IncludedItemInput = {
  name: string;
  quantity: number;
  notes: string | null;
};

export type UpdateProductTypeProps = {
  categoryId?: string | null;
  billingUnitId?: string;
  name?: string;
  description?: string | null;
  imageUrl?: string;
  kind?: RentalItemKind;
  trackingMode?: TrackingMode;
  excludeFromNewArrivals?: boolean;
  attributes?: Record<string, unknown> | null;
  includedItems?: IncludedItemInput[] | null;
};

export class UpdateProductTypeCommand {
  constructor(
    public readonly tenantId: string,
    public readonly productTypeId: string,
    public readonly patch: UpdateProductTypeProps,
  ) {}
}
