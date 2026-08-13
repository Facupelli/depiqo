import { Result } from 'neverthrow';

export interface GetTenantInput {
  tenantId: string;
}

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  customDomain: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
}

export interface GetRentalCustomerNotificationRecipientInput {
  tenantId: string;
  rentalCustomerId: string;
}

export interface RentalCustomerNotificationRecipient {
  id: string;
  tenantId: string;
  email: string;
  isActive: boolean;
  deletedAt: Date | null;
}

export interface GetRentalBudgetDocumentContextInput {
  tenantId: string;
  branchId: string;
  customerId: string | null;
}

export interface RentalBudgetDocumentContext {
  tenant: {
    slug: string;
    logoUrl: string | null;
  };
  branch: {
    timezone: string;
  };
  contractSigner: {
    fullName: string;
    documentNumber: string;
    address: string | null;
    phone: string | null;
    signatureUrl: string | null;
  } | null;
  customer: {
    fullName: string;
    documentNumber: string | null;
    address: string | null;
    phone: string | null;
  } | null;
}

export interface GetTenantAdminNotificationRecipientsInput {
  tenantId: string;
}

export interface TenantAdminNotificationRecipient {
  email: string;
  name?: string;
}

export type TenantManagementPublicApiErrorCode =
  | 'TenantNotFound'
  | 'TenantConfigInvalid'
  | 'RentalCustomerNotFound'
  | 'BranchNotFound';

export interface TenantManagementPublicApiError {
  code: TenantManagementPublicApiErrorCode;
  message: string;
  cause?: unknown;
}

export abstract class TenantManagementPublicApi {
  abstract getTenant(input: GetTenantInput): Promise<Result<TenantContext, TenantManagementPublicApiError>>;

  abstract getRentalCustomerNotificationRecipient(
    input: GetRentalCustomerNotificationRecipientInput,
  ): Promise<Result<RentalCustomerNotificationRecipient, TenantManagementPublicApiError>>;

  abstract getRentalBudgetDocumentContext(
    input: GetRentalBudgetDocumentContextInput,
  ): Promise<Result<RentalBudgetDocumentContext, TenantManagementPublicApiError>>;

  abstract getTenantAdminNotificationRecipients(
    input: GetTenantAdminNotificationRecipientsInput,
  ): Promise<Result<TenantAdminNotificationRecipient[], TenantManagementPublicApiError>>;
}
