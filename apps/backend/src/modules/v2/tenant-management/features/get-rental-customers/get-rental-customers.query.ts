import { V2RentalCustomerOnboardingStatus } from 'src/generated/prisma/enums';

export class GetRentalCustomersQuery {
  constructor(
    public readonly tenantId: string,
    public readonly status?: V2RentalCustomerOnboardingStatus,
    public readonly search: string | undefined = undefined,
    public readonly page: number = 1,
    public readonly pageSize: number = 20,
  ) {}
}
