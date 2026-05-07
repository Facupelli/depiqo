import { ICommand } from '@nestjs/cqrs';
import { RentalItemKind, TrackingMode } from '@repo/types';

type IncludedItemInput = {
  name: string;
  quantity: number;
  notes: string | null;
};

type CreateProductTypeProps = {
  categoryId: string | null;
  billingUnitId: string;
  name: string;
  description: string | null;
  imageUrl: string;
  kind: RentalItemKind;
  trackingMode: TrackingMode;
  excludeFromNewArrivals: boolean;
  attributes: Record<string, unknown> | null;
  includedItems: IncludedItemInput[] | null;
};

export class CreateProductTypeCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly props: CreateProductTypeProps,
  ) {}
}
