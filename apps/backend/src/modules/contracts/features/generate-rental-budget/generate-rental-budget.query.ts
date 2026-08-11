import { RentalBudgetCustomerOverride } from '../../application/rental-budget/rental-budget-document.service';

export class GenerateRentalBudgetQuery {
  constructor(
    public readonly tenantId: string,
    public readonly rentalId: string,
    public readonly customer?: RentalBudgetCustomerOverride,
  ) {}
}
