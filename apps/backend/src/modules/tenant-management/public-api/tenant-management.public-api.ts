import { Result } from 'neverthrow';

import { RentalCommitmentError } from '../../rental-commitment/domain/errors/rental-commitment.errors';
import { TenantConfigProps } from '../domain/value-objects/tenant-config.value-object';
import { FulfillmentMethod } from '../../rental-commitment/domain/rental-status';
import { RentalPeriod } from '../../rental-commitment/domain/value-objects/rental-period.value-object';

export interface ValidateWhatsAppStylePendingRentalInput {
  tenantId: string;
  branchId: string;
  rentalCustomerId: string;
  period: RentalPeriod;
}

export interface ValidateDraftRentalInput {
  tenantId: string;
  branchId: string;
  rentalCustomerId?: string;
  period: RentalPeriod;
  fulfillmentMethod: FulfillmentMethod;
}

export interface ValidateProfessionalConfirmedRentalCreationInput {
  tenantId: string;
  branchId: string;
  rentalCustomerId: string;
  period: RentalPeriod;
  fulfillmentMethod: FulfillmentMethod;
}

export interface ValidateOfferingSetupInput {
  tenantId: string;
  branchIds: string[];
}

export type ValidateOfferingSetupErrorCode = 'TenantUnavailable' | 'BranchUnavailable';

export interface ValidateOfferingSetupError {
  code: ValidateOfferingSetupErrorCode;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}

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

export interface GetTenantConfigInput {
  tenantId: string;
}

export interface GetTenantPricingConfigInput {
  tenantId: string;
}

export interface GetRentalCustomerNotificationRecipientInput {
  tenantId: string;
  rentalCustomerId: string;
}

export interface ValidateCustomerForStaffDraftRentalInput {
  tenantId: string;
  customerId: string;
}

export type StaffDraftRentalCustomerEligibilityReason =
  | 'CustomerNotFoundOrOutsideTenant'
  | 'CustomerDeleted'
  | 'CustomerInactive';

export type ValidateCustomerForStaffDraftRentalResult =
  | { eligible: true }
  | { eligible: false; reason: StaffDraftRentalCustomerEligibilityReason };

export interface RentalCustomerNotificationRecipient {
  id: string;
  tenantId: string;
  email: string;
  isActive: boolean;
  deletedAt: Date | null;
}

export interface GetBranchContextInput {
  tenantId: string;
  branchId: string;
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
  customer: {
    fullName: string;
    documentNumber: string | null;
    address: string | null;
    phone: string | null;
  } | null;
}

export interface GetBranchContextsInput {
  tenantId: string;
  branchIds: string[];
}

export interface BranchContext {
  id: string;
  supportsDelivery: boolean;
  isActive: boolean;
  isDeleted: boolean;
  effectiveTimezone: string;
  branchTimezone: string | null;
  tenantTimezone: string;
  timezoneSource: 'BRANCH' | 'TENANT' | 'DEFAULT';
}

export interface GetTenantAdminNotificationRecipientsInput {
  tenantId: string;
}

export interface TenantAdminNotificationRecipient {
  email: string;
  name?: string;
}

export type GetTenantConfigResult = TenantConfigProps;

export interface GetTenantPricingConfigResult {
  timezone: string;
  locale: string;
  dailyBillingPolicy: 'IGNORE_PARTIAL_DAY' | 'BILL_OVER_HALF_DAY' | 'BILL_ANY_PARTIAL_DAY';
  minimumChargedDays: number;
  halfDayThresholdMinutes: number;
  insuranceEnabled: boolean;
  insuranceRatePercent: number;
}

export interface RentalPricingValidationConfig {
  timezone: string;
  dailyBillingPolicy: 'IGNORE_PARTIAL_DAY' | 'BILL_OVER_HALF_DAY' | 'BILL_ANY_PARTIAL_DAY';
  minimumChargedDays: number;
  halfDayThresholdMinutes?: number;
}

export interface ValidateDraftRentalResult {
  pricingConfig: RentalPricingValidationConfig;
}

export interface ValidateProfessionalConfirmedRentalCreationResult {
  pricingConfig: RentalPricingValidationConfig;
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
  abstract validateWhatsAppStylePendingRental(
    input: ValidateWhatsAppStylePendingRentalInput,
  ): Promise<Result<void, RentalCommitmentError>>;

  abstract validateDraftRental(
    input: ValidateDraftRentalInput,
  ): Promise<Result<ValidateDraftRentalResult, RentalCommitmentError>>;

  abstract validateProfessionalConfirmedRentalCreation(
    input: ValidateProfessionalConfirmedRentalCreationInput,
  ): Promise<Result<ValidateProfessionalConfirmedRentalCreationResult, RentalCommitmentError>>;

  abstract validateOfferingSetup(input: ValidateOfferingSetupInput): Promise<Result<void, ValidateOfferingSetupError>>;

  abstract getTenant(input: GetTenantInput): Promise<Result<TenantContext, TenantManagementPublicApiError>>;

  abstract getTenantConfig(
    input: GetTenantConfigInput,
  ): Promise<Result<GetTenantConfigResult, TenantManagementPublicApiError>>;

  abstract getTenantPricingConfig(
    input: GetTenantPricingConfigInput,
  ): Promise<Result<GetTenantPricingConfigResult, RentalCommitmentError>>;

  abstract validateCustomerForStaffDraftRental(
    input: ValidateCustomerForStaffDraftRentalInput,
  ): Promise<ValidateCustomerForStaffDraftRentalResult>;

  abstract getRentalCustomerNotificationRecipient(
    input: GetRentalCustomerNotificationRecipientInput,
  ): Promise<Result<RentalCustomerNotificationRecipient, TenantManagementPublicApiError>>;

  abstract getBranchContext(
    input: GetBranchContextInput,
  ): Promise<Result<BranchContext, TenantManagementPublicApiError>>;

  abstract getRentalBudgetDocumentContext(
    input: GetRentalBudgetDocumentContextInput,
  ): Promise<Result<RentalBudgetDocumentContext, TenantManagementPublicApiError>>;

  abstract getBranchContexts(
    input: GetBranchContextsInput,
  ): Promise<Result<BranchContext[], TenantManagementPublicApiError>>;

  abstract getTenantAdminNotificationRecipients(
    input: GetTenantAdminNotificationRecipientsInput,
  ): Promise<Result<TenantAdminNotificationRecipient[], TenantManagementPublicApiError>>;
}
