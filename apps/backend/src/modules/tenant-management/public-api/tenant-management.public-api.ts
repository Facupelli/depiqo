import { Result } from 'neverthrow';

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

export interface GetTenantAdminNotificationRecipientsInput {
  tenantId: string;
}

export interface TenantAdminNotificationRecipient {
  email: string;
  name?: string;
}

export type TenantManagementPublicApiError = { code: 'RentalCustomerNotFound'; message: string };

export abstract class TenantManagementPublicApi {
  abstract getRentalCustomerNotificationRecipient(
    input: GetRentalCustomerNotificationRecipientInput,
  ): Promise<Result<RentalCustomerNotificationRecipient, TenantManagementPublicApiError>>;

  abstract getTenantAdminNotificationRecipients(
    input: GetTenantAdminNotificationRecipientsInput,
  ): Promise<Result<TenantAdminNotificationRecipient[], TenantManagementPublicApiError>>;
}
