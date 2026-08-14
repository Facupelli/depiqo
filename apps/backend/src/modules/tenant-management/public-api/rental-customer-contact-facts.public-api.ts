export interface GetRentalCustomerContactFactsInput {
  tenantId: string;
  rentalCustomerId: string;
}

export interface RentalCustomerContactFact {
  rentalCustomerId: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  isDeleted: boolean;
}

export abstract class RentalCustomerContactFacts {
  abstract getRentalCustomerContactFacts(
    input: GetRentalCustomerContactFactsInput,
  ): Promise<RentalCustomerContactFact | null>;
}
