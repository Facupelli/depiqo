export interface GetRentalCustomerProfileFactsInput {
  tenantId: string;
  rentalCustomerId: string;
}

export interface RentalCustomerProfileFact {
  rentalCustomerId: string;
  fullName: string;
  documentNumber: string | null;
  address: string | null;
  phone: string | null;
}

export abstract class RentalCustomerProfileFacts {
  abstract getRentalCustomerProfileFacts(
    input: GetRentalCustomerProfileFactsInput,
  ): Promise<RentalCustomerProfileFact | null>;
}
