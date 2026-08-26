import { IQuery } from '@nestjs/cqrs';

import { RentableItemKind, RentableItemStatus } from '../../domain/rentable-item.aggregate';

type GetRentableItemsQueryProps = {
  search?: string;
  kind?: RentableItemKind;
  status?: RentableItemStatus;
  categoryId?: string;
  branchId?: string;
  isVisible?: boolean;
  isRentable?: boolean;
  hasActivePricing?: boolean;
  page: number;
  pageSize: number;
};

export class GetRentableItemsQuery implements IQuery {
  public readonly search?: string;
  public readonly kind?: RentableItemKind;
  public readonly status?: RentableItemStatus;
  public readonly categoryId?: string;
  public readonly branchId?: string;
  public readonly isVisible?: boolean;
  public readonly isRentable?: boolean;
  public readonly hasActivePricing?: boolean;
  public readonly page: number;
  public readonly pageSize: number;

  constructor(
    public readonly tenantId: string,
    props: GetRentableItemsQueryProps,
  ) {
    this.search = props.search;
    this.kind = props.kind;
    this.status = props.status;
    this.categoryId = props.categoryId;
    this.branchId = props.branchId;
    this.isVisible = props.isVisible;
    this.isRentable = props.isRentable;
    this.hasActivePricing = props.hasActivePricing;
    this.page = props.page;
    this.pageSize = props.pageSize;
  }
}
