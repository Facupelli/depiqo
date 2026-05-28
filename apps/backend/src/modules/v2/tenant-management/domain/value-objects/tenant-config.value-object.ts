import {
  InvalidBookingModeError,
  InvalidDefaultCurrencyError,
  InvalidInsuranceRatePercentError,
  InvalidMaxOverRentThresholdError,
  InvalidNewArrivalsWindowDaysError,
  InvalidOrderCommunicationModeError,
  InvalidWhatsAppNumberError,
  MissingWhatsAppNumberForWhatsAppModeError,
} from '../errors/tenant-management.errors';
import { assertValidIanaTimezone } from '../utils/timezone.validation';

export const TenantRoundingRule = {
  IGNORE_PARTIAL_DAY: 'IGNORE_PARTIAL_DAY',
  BILL_OVER_HALF_DAY: 'BILL_OVER_HALF_DAY',
  BILL_ANY_PARTIAL_DAY: 'BILL_ANY_PARTIAL_DAY',
} as const;

export type TenantRoundingRule = (typeof TenantRoundingRule)[keyof typeof TenantRoundingRule];

export const TenantBookingMode = {
  INSTANT_BOOK: 'instant-book',
  REQUEST_TO_BOOK: 'request-to-book',
} as const;

export type TenantBookingMode = (typeof TenantBookingMode)[keyof typeof TenantBookingMode];

export const TenantOrderCommunicationMode = {
  FORMAL: 'FORMAL',
  WHATSAPP: 'WHATSAPP',
} as const;

export type TenantOrderCommunicationMode =
  (typeof TenantOrderCommunicationMode)[keyof typeof TenantOrderCommunicationMode];

export type TenantNotificationChannel = 'EMAIL';

export interface TenantPricingConfigProps {
  overRentalEnabled: boolean;
  maxOverRentThreshold: number;
  weekendCountsAsOne: boolean;
  roundingRule: TenantRoundingRule;
  currency: string;
  locale: string;
  insuranceEnabled: boolean;
  insuranceRatePercent: number;
}

export interface TenantNotificationsConfigProps {
  enabledChannels: TenantNotificationChannel[];
}

export interface TenantCommunicationConfigProps {
  orderCommunicationMode: TenantOrderCommunicationMode;
  whatsAppNumber?: string;
  showFloatingWhatsAppButton: boolean;
}

export interface TenantConfigProps {
  pricing: TenantPricingConfigProps;
  notifications: TenantNotificationsConfigProps;
  communication: TenantCommunicationConfigProps;
  timezone: string;
  newArrivalsWindowDays: number;
  bookingMode: TenantBookingMode;
}

export type TenantConfigPatch = {
  pricing?: Partial<TenantPricingConfigProps>;
  notifications?: Partial<TenantNotificationsConfigProps>;
  communication?: Partial<TenantCommunicationConfigProps>;
  timezone?: string;
  newArrivalsWindowDays?: number;
  bookingMode?: TenantBookingMode;
};

export class TenantConfig {
  private static readonly WHATSAPP_NUMBER_CANONICAL_REGEX = /^\d{6,15}$/;

  readonly pricing: Readonly<TenantPricingConfigProps>;
  readonly notifications: Readonly<TenantNotificationsConfigProps>;
  readonly timezone: string;
  readonly newArrivalsWindowDays: number;
  readonly bookingMode: TenantBookingMode;
  readonly communication: Readonly<TenantCommunicationConfigProps>;

  private constructor(props: TenantConfigProps) {
    this.pricing = Object.freeze({ ...props.pricing });
    this.notifications = Object.freeze({ ...props.notifications });
    this.timezone = props.timezone;
    this.newArrivalsWindowDays = props.newArrivalsWindowDays;
    this.bookingMode = props.bookingMode;
    this.communication = Object.freeze({ ...props.communication });
  }

  static create(props: TenantConfigProps): TenantConfig {
    const normalizedProps = TenantConfig.normalizeProps(props);

    TenantConfig.validateTimezone(normalizedProps.timezone);
    TenantConfig.validateNewArrivalsWindowDays(normalizedProps.newArrivalsWindowDays);
    TenantConfig.validateDefaultCurrency(normalizedProps.pricing.currency);
    TenantConfig.validateMaxOverRentThreshold(normalizedProps.pricing.maxOverRentThreshold);
    TenantConfig.validateInsuranceRatePercent(normalizedProps.pricing.insuranceRatePercent);
    TenantConfig.validateBookingMode(normalizedProps.bookingMode);
    TenantConfig.validateCommunication(normalizedProps.communication);

    return new TenantConfig(normalizedProps);
  }

  static reconstitute(props: TenantConfigProps): TenantConfig {
    return new TenantConfig(TenantConfig.normalizeProps(props));
  }

  static default(): TenantConfig {
    return TenantConfig.create({
      pricing: {
        overRentalEnabled: false,
        maxOverRentThreshold: 0,
        weekendCountsAsOne: false,
        roundingRule: TenantRoundingRule.IGNORE_PARTIAL_DAY,
        currency: 'ARS',
        locale: 'es-AR',
        insuranceEnabled: false,
        insuranceRatePercent: 0,
      },
      notifications: {
        enabledChannels: ['EMAIL'],
      },
      timezone: 'UTC',
      newArrivalsWindowDays: 30,
      bookingMode: TenantBookingMode.INSTANT_BOOK,
      communication: {
        orderCommunicationMode: TenantOrderCommunicationMode.FORMAL,
        showFloatingWhatsAppButton: false,
      },
    });
  }

  merge(patch: TenantConfigPatch): TenantConfig {
    return TenantConfig.create({
      timezone: patch.timezone ?? this.timezone,
      newArrivalsWindowDays: patch.newArrivalsWindowDays ?? this.newArrivalsWindowDays,
      bookingMode: patch.bookingMode ?? this.bookingMode,
      communication: {
        ...this.communication,
        ...patch.communication,
      },
      pricing: {
        ...this.pricing,
        ...patch.pricing,
      },
      notifications: {
        ...this.notifications,
        ...patch.notifications,
      },
    });
  }

  toPlainObject(): TenantConfigProps {
    return {
      timezone: this.timezone,
      newArrivalsWindowDays: this.newArrivalsWindowDays,
      bookingMode: this.bookingMode,
      communication: { ...this.communication },
      pricing: { ...this.pricing },
      notifications: { ...this.notifications },
    };
  }

  private static normalizeProps(props: TenantConfigProps): TenantConfigProps {
    const communication = TenantConfig.normalizeCommunication(props.communication);
    const bookingMode =
      communication.orderCommunicationMode === TenantOrderCommunicationMode.WHATSAPP
        ? TenantBookingMode.REQUEST_TO_BOOK
        : props.bookingMode;

    return {
      ...props,
      pricing: { ...props.pricing },
      notifications: { ...props.notifications },
      bookingMode,
      communication,
    };
  }

  private static normalizeCommunication(communication: TenantCommunicationConfigProps): TenantCommunicationConfigProps {
    return {
      ...communication,
      whatsAppNumber: TenantConfig.normalizeWhatsAppNumber(communication.whatsAppNumber),
    };
  }

  private static normalizeWhatsAppNumber(whatsAppNumber?: string): string | undefined {
    if (whatsAppNumber === undefined) {
      return undefined;
    }

    const trimmedNumber = whatsAppNumber.trim();
    if (trimmedNumber.length === 0) {
      return undefined;
    }

    const numberWithoutLeadingPlus = trimmedNumber.startsWith('+') ? trimmedNumber.slice(1) : trimmedNumber;
    const canonicalNumber = numberWithoutLeadingPlus.replace(/[\s\-().]/g, '');

    if (!/^\d+$/.test(canonicalNumber)) {
      throw new InvalidWhatsAppNumberError(whatsAppNumber);
    }

    return canonicalNumber;
  }

  private static validateTimezone(timezone: string): void {
    assertValidIanaTimezone(timezone);
  }

  private static validateNewArrivalsWindowDays(days: number): void {
    if (!Number.isInteger(days) || days <= 0) {
      throw new InvalidNewArrivalsWindowDaysError(days);
    }
  }

  private static validateDefaultCurrency(currency: string): void {
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new InvalidDefaultCurrencyError(currency);
    }
  }

  private static validateMaxOverRentThreshold(threshold: number): void {
    if (typeof threshold !== 'number' || threshold < 0) {
      throw new InvalidMaxOverRentThresholdError(threshold);
    }
  }

  private static validateInsuranceRatePercent(ratePercent: number): void {
    if (typeof ratePercent !== 'number' || ratePercent < 0 || ratePercent > 100) {
      throw new InvalidInsuranceRatePercentError(ratePercent);
    }
  }

  private static validateBookingMode(mode: TenantBookingMode): void {
    if (mode !== TenantBookingMode.INSTANT_BOOK && mode !== TenantBookingMode.REQUEST_TO_BOOK) {
      throw new InvalidBookingModeError(mode);
    }
  }

  private static validateCommunication(communication: TenantCommunicationConfigProps): void {
    TenantConfig.validateOrderCommunicationMode(communication.orderCommunicationMode);

    if (communication.whatsAppNumber !== undefined) {
      TenantConfig.validateWhatsAppNumber(communication.whatsAppNumber);
    }

    if (
      communication.orderCommunicationMode === TenantOrderCommunicationMode.WHATSAPP &&
      !communication.whatsAppNumber
    ) {
      throw new MissingWhatsAppNumberForWhatsAppModeError();
    }
  }

  private static validateOrderCommunicationMode(mode: TenantOrderCommunicationMode): void {
    if (mode !== TenantOrderCommunicationMode.FORMAL && mode !== TenantOrderCommunicationMode.WHATSAPP) {
      throw new InvalidOrderCommunicationModeError(mode);
    }
  }

  private static validateWhatsAppNumber(whatsAppNumber: string): void {
    if (!TenantConfig.WHATSAPP_NUMBER_CANONICAL_REGEX.test(whatsAppNumber)) {
      throw new InvalidWhatsAppNumberError(whatsAppNumber);
    }
  }
}
