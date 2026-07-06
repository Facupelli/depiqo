import type {
  GetRentalsDateLensDto,
  GetRentalsSortByDto,
  GetRentalsSortDirectionDto,
  GetRentalsStatusDto,
} from '@repo/api-contracts';

export class GetRentalsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly page: number,
    public readonly limit: number,
    public readonly branchId?: string,
    public readonly customerId?: string,
    public readonly statuses?: GetRentalsStatusDto[],
    public readonly dateLens?: GetRentalsDateLensDto,
    public readonly sortBy?: GetRentalsSortByDto,
    public readonly sortDirection?: GetRentalsSortDirectionDto,
  ) {}
}
