import { IQuery } from '@nestjs/cqrs';

import { RentableItemKind } from '../../domain/rentable-item.aggregate';

type GetRentableItemsQueryProps = {
  search?: string;
  kinds?: RentableItemKind[];
  archived?: boolean;
  categoryId?: string;
  branchId?: string;
  showInStore?: boolean;
  isRentable?: boolean;
  hasActivePricing?: boolean;
  page: number;
  pageSize: number;
};

export class GetRentableItemsQuery implements IQuery {
  public readonly search?: string;
  public readonly kinds?: RentableItemKind[];
  public readonly archived?: boolean;
  public readonly categoryId?: string;
  public readonly branchId?: string;
  public readonly showInStore?: boolean;
  public readonly isRentable?: boolean;
  public readonly hasActivePricing?: boolean;
  public readonly page: number;
  public readonly pageSize: number;

  constructor(
    public readonly tenantId: string,
    props: GetRentableItemsQueryProps,
  ) {
    this.search = props.search;
    this.kinds = props.kinds;
    this.archived = props.archived;
    this.categoryId = props.categoryId;
    this.branchId = props.branchId;
    this.showInStore = props.showInStore;
    this.isRentable = props.isRentable;
    this.hasActivePricing = props.hasActivePricing;
    this.page = props.page;
    this.pageSize = props.pageSize;
  }
}
