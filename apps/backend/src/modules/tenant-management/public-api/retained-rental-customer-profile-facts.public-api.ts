/**
 * Reads legal/profile facts retained for a customer reference already established by another bounded context.
 *
 * This is not a general customer lookup: it may return soft-deleted customers so historical rental
 * documents can be composed. It does not make those customers selectable or operationally eligible.
 */
export interface GetRetainedRentalCustomerProfileFactsInput {
  tenantId: string;
  rentalCustomerId: string;
}

export interface RetainedRentalCustomerProfileFact {
  rentalCustomerId: string;
  fullName: string;
  documentNumber: string | null;
  address: string | null;
  phone: string | null;
}

export abstract class RetainedRentalCustomerProfileFacts {
  abstract getRetainedRentalCustomerProfileFacts(
    input: GetRetainedRentalCustomerProfileFactsInput,
  ): Promise<RetainedRentalCustomerProfileFact | null>;
}
