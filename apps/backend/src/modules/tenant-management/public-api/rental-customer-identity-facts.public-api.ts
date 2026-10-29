export interface GetRentalCustomerIdentityFactsBatchInput {
  tenantId: string;
  rentalCustomerIds: string[];
}

export interface RentalCustomerIdentityFact {
  rentalCustomerId: string;
  displayName: string;
  isCompany: boolean;
}

export abstract class RentalCustomerIdentityFacts {
  abstract getRentalCustomerIdentityFactsBatch(
    input: GetRentalCustomerIdentityFactsBatchInput,
  ): Promise<RentalCustomerIdentityFact[]>;
}
