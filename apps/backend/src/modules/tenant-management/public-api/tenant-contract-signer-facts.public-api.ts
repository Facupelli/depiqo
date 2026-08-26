export interface GetSelectedTenantContractSignerFactsInput {
  tenantId: string;
}

export interface TenantContractSignerFact {
  fullName: string;
  documentNumber: string;
  address: string | null;
  phone: string | null;
  signatureUrl: string | null;
}

export abstract class TenantContractSignerFacts {
  abstract getSelectedTenantContractSignerFacts(
    input: GetSelectedTenantContractSignerFactsInput,
  ): Promise<TenantContractSignerFact | null>;
}
