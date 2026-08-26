import { Result } from 'neverthrow';

export const TENANT_NOTIFICATION_DELIVERY_CHANNELS = ['EMAIL'] as const;
export type TenantNotificationDeliveryChannel = (typeof TENANT_NOTIFICATION_DELIVERY_CHANNELS)[number];

export const TenantOrderCommunicationMode = {
  FORMAL: 'FORMAL',
  WHATSAPP: 'WHATSAPP',
} as const;
export type TenantOrderCommunicationMode =
  (typeof TenantOrderCommunicationMode)[keyof typeof TenantOrderCommunicationMode];

export interface GetTenantNotificationPreferencesInput {
  tenantId: string;
}

export interface TenantNotificationPreferencesFact {
  enabledChannels: TenantNotificationDeliveryChannel[];
  orderCommunicationMode: TenantOrderCommunicationMode;
}

export type TenantNotificationPreferencesError =
  | { code: 'TenantNotFound'; message: string }
  | { code: 'TenantConfigurationInvalid'; message: string };

export abstract class TenantNotificationPreferences {
  abstract getTenantNotificationPreferences(
    input: GetTenantNotificationPreferencesInput,
  ): Promise<Result<TenantNotificationPreferencesFact, TenantNotificationPreferencesError>>;
}
