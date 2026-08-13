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

export interface GetTenantPricingConfigInput {
  tenantId: string;
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

export interface GetTenantPricingConfigResult {
  timezone: string;
  locale: string;
  dailyBillingPolicy: 'IGNORE_PARTIAL_DAY' | 'BILL_OVER_HALF_DAY' | 'BILL_ANY_PARTIAL_DAY';
  minimumChargedDays: number;
  halfDayThresholdMinutes: number;
  insuranceEnabled: boolean;
  insuranceRatePercent: number;
}

export interface CategoryDisplayFact {
  id: string;
  name: string;
}

export interface GetCategoryDisplayFactsInput {
  tenantId: string;
  categoryIds: string[];
}

export interface ValidateCategoryAssignmentInput {
  tenantId: string;
  categoryId: string;
}

export type ValidateCategoryAssignmentErrorCode = 'CategoryNotFound' | 'CategoryInactive';

export interface ValidateCategoryAssignmentError {
  code: ValidateCategoryAssignmentErrorCode;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
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
  abstract getCategoryDisplayFacts(input: GetCategoryDisplayFactsInput): Promise<CategoryDisplayFact[]>;

  abstract validateCategoryAssignment(
    input: ValidateCategoryAssignmentInput,
  ): Promise<Result<void, ValidateCategoryAssignmentError>>;

  abstract getTenant(input: GetTenantInput): Promise<Result<TenantContext, TenantManagementPublicApiError>>;

  abstract getTenantPricingConfig(
    input: GetTenantPricingConfigInput,
  ): Promise<Result<GetTenantPricingConfigResult, TenantManagementPublicApiError>>;

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
