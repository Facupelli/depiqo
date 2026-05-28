import { OrderCommunicationMode, RoundingRule } from '@repo/types';

import {
  InvalidBookingModeException,
  InvalidInsuranceRatePercentException,
  InvalidOrderCommunicationModeException,
} from '../exceptions/tenant.exceptions';
import { TenantConfig } from './tenant-config.value-object';

describe('TenantConfig', () => {
  it('defaults bookingMode to instant-book', () => {
    const config = TenantConfig.default();

    expect(config.bookingMode).toBe('instant-book');
    expect(config.toPlainObject().bookingMode).toBe('instant-book');
    expect(config.pricing.insuranceEnabled).toBe(false);
    expect(config.pricing.insuranceRatePercent).toBe(0);
    expect(config.communication.orderCommunicationMode).toBe(OrderCommunicationMode.FORMAL);
    expect(config.communication.showFloatingWhatsAppButton).toBe(false);
  });

  it('rejects invalid bookingMode values', () => {
    expect(() =>
      TenantConfig.create({
        pricing: {
          overRentalEnabled: false,
          maxOverRentThreshold: 0,
          weekendCountsAsOne: false,
          roundingRule: RoundingRule.IGNORE_PARTIAL_DAY,
          currency: 'ARS',
          locale: 'es-AR',
          insuranceEnabled: false,
          insuranceRatePercent: 0,
        },
        timezone: 'UTC',
        newArrivalsWindowDays: 30,
        bookingMode: 'invalid-mode' as never,
        communication: {
          orderCommunicationMode: OrderCommunicationMode.FORMAL,
          showFloatingWhatsAppButton: false,
        },
      }),
    ).toThrow(InvalidBookingModeException);
  });

  it('rejects invalid order communication mode values', () => {
    expect(() =>
      TenantConfig.create({
        pricing: {
          overRentalEnabled: false,
          maxOverRentThreshold: 0,
          weekendCountsAsOne: false,
          roundingRule: RoundingRule.IGNORE_PARTIAL_DAY,
          currency: 'ARS',
          locale: 'es-AR',
          insuranceEnabled: false,
          insuranceRatePercent: 0,
        },
        timezone: 'UTC',
        newArrivalsWindowDays: 30,
        bookingMode: 'instant-book',
        communication: {
          orderCommunicationMode: 'invalid-mode' as never,
          showFloatingWhatsAppButton: false,
        },
      }),
    ).toThrow(InvalidOrderCommunicationModeException);
  });

  it('normalizes legacy configs without bookingMode on reconstitution', () => {
    const config = TenantConfig.reconstitute({
      pricing: {
        overRentalEnabled: false,
        maxOverRentThreshold: 0,
        weekendCountsAsOne: false,
        roundingRule: RoundingRule.IGNORE_PARTIAL_DAY,
        currency: 'ARS',
        locale: 'es-AR',
        insuranceEnabled: false,
        insuranceRatePercent: 0,
      },
      timezone: 'UTC',
      newArrivalsWindowDays: 30,
      communication: {
        orderCommunicationMode: OrderCommunicationMode.FORMAL,
        showFloatingWhatsAppButton: false,
      },
    });

    expect(config.bookingMode).toBe('instant-book');
    expect(config.pricing.insuranceEnabled).toBe(false);
    expect(config.pricing.insuranceRatePercent).toBe(0);
  });

  it('keeps the configured daily billing behavior during reconstitution', () => {
    const config = TenantConfig.reconstitute({
      pricing: {
        overRentalEnabled: false,
        maxOverRentThreshold: 0,
        weekendCountsAsOne: false,
        roundingRule: RoundingRule.BILL_OVER_HALF_DAY,
        currency: 'ARS',
        locale: 'es-AR',
        insuranceEnabled: false,
        insuranceRatePercent: 0,
      },
      timezone: 'UTC',
      newArrivalsWindowDays: 30,
      communication: {
        orderCommunicationMode: OrderCommunicationMode.FORMAL,
        showFloatingWhatsAppButton: false,
      },
    });

    expect(config.pricing.roundingRule).toBe(RoundingRule.BILL_OVER_HALF_DAY);
  });

  it('rejects insurance rates above 100 percent', () => {
    expect(() =>
      TenantConfig.create({
        pricing: {
          overRentalEnabled: false,
          maxOverRentThreshold: 0,
          weekendCountsAsOne: false,
          roundingRule: RoundingRule.IGNORE_PARTIAL_DAY,
          currency: 'ARS',
          locale: 'es-AR',
          insuranceEnabled: true,
          insuranceRatePercent: 101,
        },
        timezone: 'UTC',
        newArrivalsWindowDays: 30,
        bookingMode: 'instant-book',
        communication: {
          orderCommunicationMode: OrderCommunicationMode.FORMAL,
          showFloatingWhatsAppButton: false,
        },
      }),
    ).toThrow(InvalidInsuranceRatePercentException);
  });
});
