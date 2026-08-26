import {
  InvalidBookingModeError,
  InvalidDefaultCurrencyError,
  InvalidInsuranceDescriptionError,
  InvalidInsuranceLabelError,
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
  BILL_OVER_QUARTER_DAY: 'BILL_OVER_QUARTER_DAY',
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
  insuranceLabel: string;
  insuranceDescription: string;
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
  static readonly DEFAULT_INSURANCE_LABEL = 'Seguro de equipos';
  static readonly DEFAULT_INSURANCE_DESCRIPTION = `Protege tu pedido ante imprevistos durante el alquiler. El cargo se calcula sobre el subtotal antes de descuentos y se suma al total final.`;

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
    const normalizedProps = TenantConfig.normalizeProps(props, TenantConfig.normalizePricingForCreate);

    TenantConfig.validateTimezone(normalizedProps.timezone);
    TenantConfig.validateNewArrivalsWindowDays(normalizedProps.newArrivalsWindowDays);
    TenantConfig.validateDefaultCurrency(normalizedProps.pricing.currency);
    TenantConfig.validateMaxOverRentThreshold(normalizedProps.pricing.maxOverRentThreshold);
    TenantConfig.validateInsuranceRatePercent(normalizedProps.pricing.insuranceRatePercent);
    TenantConfig.validateInsuranceLabel(normalizedProps.pricing.insuranceLabel);
    TenantConfig.validateInsuranceDescription(normalizedProps.pricing.insuranceDescription);
    TenantConfig.validateBookingMode(normalizedProps.bookingMode);
    TenantConfig.validateCommunication(normalizedProps.communication);

    return new TenantConfig(normalizedProps);
  }

  static reconstitute(props: TenantConfigProps): TenantConfig {
    return new TenantConfig(TenantConfig.normalizeProps(props, TenantConfig.normalizePricingForReconstitution));
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
        insuranceLabel: TenantConfig.DEFAULT_INSURANCE_LABEL,
        insuranceDescription: TenantConfig.DEFAULT_INSURANCE_DESCRIPTION,
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

  private static normalizeProps(
    props: TenantConfigProps,
    normalizePricing: (pricing: TenantPricingConfigProps) => TenantPricingConfigProps,
  ): TenantConfigProps {
    const pricing = normalizePricing(props.pricing);
    const communication = TenantConfig.normalizeCommunication(props.communication);
    const bookingMode =
      communication.orderCommunicationMode === TenantOrderCommunicationMode.WHATSAPP
        ? TenantBookingMode.REQUEST_TO_BOOK
        : props.bookingMode;

    return {
      ...props,
      pricing,
      notifications: { ...props.notifications },
      bookingMode,
      communication,
    };
  }

  private static normalizePricingForCreate(pricing: TenantPricingConfigProps): TenantPricingConfigProps {
    const normalizedPricing = { ...pricing };

    if (typeof normalizedPricing.insuranceLabel === 'string') {
      normalizedPricing.insuranceLabel = normalizedPricing.insuranceLabel.trim();
    }

    if (typeof normalizedPricing.insuranceDescription === 'string') {
      normalizedPricing.insuranceDescription = normalizedPricing.insuranceDescription.trim();
    }

    return normalizedPricing;
  }

  private static normalizePricingForReconstitution(pricing: TenantPricingConfigProps): TenantPricingConfigProps {
    if (pricing === null || typeof pricing !== 'object' || Array.isArray(pricing)) {
      return pricing;
    }

    const normalizedPricing = { ...pricing };

    if (!Object.prototype.hasOwnProperty.call(pricing, 'insuranceLabel')) {
      normalizedPricing.insuranceLabel = TenantConfig.DEFAULT_INSURANCE_LABEL;
    }

    if (!Object.prototype.hasOwnProperty.call(pricing, 'insuranceDescription')) {
      normalizedPricing.insuranceDescription = TenantConfig.DEFAULT_INSURANCE_DESCRIPTION;
    }

    return normalizedPricing;
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

  private static validateInsuranceLabel(label: string): void {
    if (typeof label !== 'string') {
      throw new InvalidInsuranceLabelError(label);
    }

    const trimmedLabel = label.trim();
    if (trimmedLabel.length === 0 || trimmedLabel.length > 80) {
      throw new InvalidInsuranceLabelError(label);
    }
  }

  private static validateInsuranceDescription(description: string): void {
    if (typeof description !== 'string') {
      throw new InvalidInsuranceDescriptionError(description);
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length === 0 || trimmedDescription.length > 2000) {
      throw new InvalidInsuranceDescriptionError(description);
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
