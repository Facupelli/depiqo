import {
  getRentalFinancialReportContract,
  GetRentalFinancialReportQuerySchema,
  GetRentalFinancialReportResponseSchema,
  RentalFinancialReportAmountSchema,
  type GetRentalFinancialReportResponseDto,
  type RentalFinancialReportTotalsDto,
} from '@repo/api-contracts';
import { describe, expect, it } from 'vitest';

function emptyTotals(): RentalFinancialReportTotalsDto {
  return {
    rentalCount: 0,
    equipmentAmount: '0.00',
    insuranceAmount: '0.00',
    deliveryAmount: '0.00',
    thirdPartyAmount: '0.00',
    owners: [],
  };
}

function emptyReport(): GetRentalFinancialReportResponseDto {
  return {
    year: 2026,
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    totals: emptyTotals(),
    periods: Array.from({ length: 12 }, (_, index) => ({
      ...emptyTotals(),
      from: `2026-${String(index + 1).padStart(2, '0')}-01`,
      until: index === 11 ? '2027-01-01' : `2026-${String(index + 2).padStart(2, '0')}-01`,
    })),
  };
}

describe('GetRentalFinancialReport contract', () => {
  it('accepts a required selected year from query-string or application input', () => {
    expect(GetRentalFinancialReportQuerySchema.parse({ year: '2026' })).toEqual({ year: 2026 });
    expect(GetRentalFinancialReportQuerySchema.parse({ year: 2026 })).toEqual({ year: 2026 });
  });

  it.each([undefined, null, '', 'not-a-year', 0, -1, 2026.5, 9999, Infinity])(
    'rejects an invalid or unrepresentable year %s',
    (year) => {
      expect(GetRentalFinancialReportQuerySchema.safeParse({ year }).success).toBe(false);
    },
  );

  it('does not expose client-supplied tenant, timezone, status, or inclusion options as query input', () => {
    expect(
      GetRentalFinancialReportQuerySchema.parse({
        year: '2026',
        tenantId: 'another-tenant',
        timezone: 'UTC',
        statuses: ['CANCELLED'],
        includeInsurance: false,
        includeDelivery: false,
      }),
    ).toEqual({ year: 2026 });
  });

  it('describes a tenant-wide report endpoint with only the selected year as input', () => {
    expect(getRentalFinancialReportContract).toMatchObject({
      method: 'GET',
      path: '/rental-commitments/financial-report',
      query: GetRentalFinancialReportQuerySchema,
      response: GetRentalFinancialReportResponseSchema,
    });
  });

  it('accepts a zero-filled year with independent components and an annual owner breakdown', () => {
    expect(GetRentalFinancialReportResponseSchema.parse(emptyReport())).toEqual(emptyReport());
  });

  it.each([0, 11, 13])('rejects a report containing %i periods instead of twelve', (count) => {
    const report = emptyReport();
    report.periods = Array.from({ length: count }, () => report.periods[0]!);

    expect(GetRentalFinancialReportResponseSchema.safeParse(report).success).toBe(false);
  });

  it('preserves missing current owner names and exact decimal amounts', () => {
    const report = emptyReport();
    const owner = { ownerId: 'historical-owner-id', ownerName: null, amount: '2300.000000000000000000000000000001' };
    for (const totals of [report.totals, report.periods[0]!]) {
      totals.rentalCount = 1;
      totals.equipmentAmount = owner.amount;
      totals.thirdPartyAmount = owner.amount;
      totals.owners = [owner];
    }

    expect(GetRentalFinancialReportResponseSchema.parse(report).totals.owners).toEqual([owner]);
  });

  it.each(['0', '0.00', '12538.19', '9007199254740993.01'])('accepts exact decimal string %s', (amount) => {
    expect(RentalFinancialReportAmountSchema.parse(amount)).toBe(amount);
  });

  it.each([0, 12.5, '-1.00', 'NaN', 'Infinity', '1e3', '1,000.00', ' 1.00 ', ''])(
    'rejects a non-decimal or invalid amount %s',
    (amount) => {
      expect(RentalFinancialReportAmountSchema.safeParse(amount).success).toBe(false);
    },
  );

  it('uses calendar-date boundaries, not timestamps', () => {
    const report = emptyReport();
    report.periods[0]!.from = '2026-01-01T00:00:00Z';

    expect(GetRentalFinancialReportResponseSchema.safeParse(report).success).toBe(false);
  });
});
