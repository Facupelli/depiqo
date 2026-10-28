import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import {
  RentalFinancialReportOwnerSchema,
  type GetRentalFinancialReportResponseDto,
  type RentalFinancialReportOwnerDto,
  type RentalFinancialReportTotalsDto,
} from '@repo/api-contracts';
import { err, ok, type Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { AssetInventoryDisplayFacts } from 'src/modules/asset-inventory/public-api/asset-inventory-display-facts.public-api';
import {
  GetCurrentTenantQuery,
  type GetCurrentTenantResult,
} from 'src/modules/tenant-management/public-api/get-current-tenant.public-api';

import {
  ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA,
  ACCEPTED_RENTAL_PRICING_SNAPSHOT_V2_VERSION,
  ACCEPTED_RENTAL_PRICING_SNAPSHOT_V3_VERSION,
} from '../../domain/value-objects/accepted-pricing-snapshot.type';
import {
  getRentalFinancialReportError,
  type GetRentalFinancialReportError,
} from './get-rental-financial-report.errors';
import { GetRentalFinancialReportQuery } from './get-rental-financial-report.query';

export type GetRentalFinancialReportResult = Result<GetRentalFinancialReportResponseDto, GetRentalFinancialReportError>;

const ownerAmountsSchema = RentalFinancialReportOwnerSchema.omit({ ownerName: true }).array();
type OwnerAmount = Omit<RentalFinancialReportOwnerDto, 'ownerName'>;

type RawFinancialReportRow = {
  periodIndex: number;
  rentalCount: bigint;
  equipmentAmount: string;
  insuranceAmount: string;
  deliveryAmount: string;
  thirdPartyAmount: string;
  owners: Prisma.JsonValue;
  invalidFacts: boolean;
  currencyMismatch: boolean;
};

type FinancialReportRow = Omit<RawFinancialReportRow, 'owners'> & { owners: OwnerAmount[] };

@QueryHandler(GetRentalFinancialReportQuery)
export class GetRentalFinancialReportHandler implements IQueryHandler<
  GetRentalFinancialReportQuery,
  GetRentalFinancialReportResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
    private readonly assetInventoryDisplayFacts: AssetInventoryDisplayFacts,
  ) {}

  async execute(query: GetRentalFinancialReportQuery): Promise<GetRentalFinancialReportResult> {
    const context = { useCase: 'GetRentalFinancialReport', tenantId: query.tenantId, year: query.year };
    const tenant = await this.queryBus.execute<GetCurrentTenantQuery, GetCurrentTenantResult>(
      new GetCurrentTenantQuery(query.tenantId),
    );
    if (tenant.isErr()) {
      return err(
        getRentalFinancialReportError(
          'rental_commitment.financial_report_tenant_not_found',
          tenant.error.message,
          tenant.error,
          context,
        ),
      );
    }

    const { timezone, pricing } = tenant.value.config;
    const currency = pricing.currency;
    if (typeof timezone !== 'string' || timezone.length === 0 || !/^[A-Z]{3}$/.test(currency)) {
      throw new Error('Tenant financial reporting configuration is invalid.');
    }
    // This is the tenant's configured timezone, not a branch timezone or a fallback.
    Intl.DateTimeFormat(undefined, { timeZone: timezone });

    const rawRows = await this.getFinancialRows(query, timezone, currency);
    if (rawRows.some((row) => row.invalidFacts)) {
      throw new Error('Financial reporting requires valid accepted rental pricing and owner amounts.');
    }
    if (rawRows.some((row) => row.currencyMismatch)) {
      return err(
        getRentalFinancialReportError(
          'rental_commitment.financial_report_currency_mismatch',
          'Accepted rental, delivery, or owner-share currencies differ from the configured tenant currency.',
          undefined,
          context,
        ),
      );
    }

    const rows: FinancialReportRow[] = rawRows.map((row) => ({
      ...row,
      owners: ownerAmountsSchema.parse(row.owners),
    }));
    const annual = rows.find((row) => row.periodIndex === 0);
    if (!annual || rows.length !== 13) throw new Error('Financial report periods are incomplete.');

    const ownerIds = [...new Set(rows.flatMap((row) => row.owners.map((owner) => owner.ownerId)))];
    const ownerFacts = ownerIds.length
      ? await this.assetInventoryDisplayFacts.getOwnerDisplayFacts({ tenantId: query.tenantId, ownerIds })
      : [];
    const ownerNames = new Map(ownerFacts.map((owner) => [owner.ownerId, owner.name]));
    const year = String(query.year).padStart(4, '0');
    const nextYear = String(query.year + 1).padStart(4, '0');

    return ok({
      year: query.year,
      timezone,
      currency,
      totals: this.toTotals(annual, ownerNames),
      periods: rows
        .filter((row) => row.periodIndex > 0)
        .map((row) => ({
          ...this.toTotals(row, ownerNames),
          from: `${year}-${String(row.periodIndex).padStart(2, '0')}-01`,
          until:
            row.periodIndex === 12 ? `${nextYear}-01-01` : `${year}-${String(row.periodIndex + 1).padStart(2, '0')}-01`,
        })),
    });
  }

  private toTotals(row: FinancialReportRow, ownerNames: Map<string, string>): RentalFinancialReportTotalsDto {
    const rentalCount = Number(row.rentalCount);
    if (!Number.isSafeInteger(rentalCount))
      throw new Error('Financial report rental count exceeds safe integer range.');
    return {
      rentalCount,
      equipmentAmount: row.equipmentAmount,
      insuranceAmount: row.insuranceAmount,
      deliveryAmount: row.deliveryAmount,
      thirdPartyAmount: row.thirdPartyAmount,
      owners: row.owners.map((owner) => ({ ...owner, ownerName: ownerNames.get(owner.ownerId) ?? null })),
    };
  }

  private getFinancialRows(
    query: GetRentalFinancialReportQuery,
    timezone: string,
    currency: string,
  ): Promise<RawFinancialReportRow[]> {
    const from = `${String(query.year).padStart(4, '0')}-01-01`;
    const until = `${String(query.year + 1).padStart(4, '0')}-01-01`;

    // One statement provides a shared snapshot for validation, revenue and owner
    // breakdowns. Period 0 is the annual total; periods 1-12 are calendar months.
    // GROUPING SETS keeps annual arithmetic in PostgreSQL numeric, without JS rounding.
    return this.prisma.client.$queryRaw<RawFinancialReportRow[]>(Prisma.sql`
      WITH rental_facts AS MATERIALIZED (
        SELECT
          r.id, r.tenant_id,
          extract(month FROM r.period_start AT TIME ZONE ${timezone})::int AS period_index,
          r.price_snapshot ->> 'schema' AS snapshot_schema,
          r.price_snapshot ->> 'version' AS snapshot_version,
          r.price_snapshot #>> '{final,currency}' AS currency,
          (r.price_snapshot #>> '{final,total}')::numeric AS equipment_amount,
          (r.price_snapshot #>> '{insurance,amount}')::numeric AS insurance_amount,
          (r.price_snapshot ->> 'totalBeforeInsurance')::numeric AS before_insurance,
          (r.price_snapshot ->> 'total')::numeric AS pricing_total,
          CASE WHEN r.fulfillment_method = 'PICKUP' THEN 0::numeric
            ELSE (r.accepted_delivery_snapshot ->> 'deliveryTotal')::numeric
          END AS delivery_amount,
          r.accepted_delivery_snapshot ->> 'currency' AS delivery_currency,
          r.fulfillment_method,
          r.accepted_customer_total, r.confirmed_at
        FROM v2_rentals r
        WHERE r.tenant_id = ${query.tenantId}
          AND r.status IN ('CONFIRMED', 'COMPLETED')
          AND r.period_start >= (${from}::date::timestamp AT TIME ZONE ${timezone})
          AND r.period_start < (${until}::date::timestamp AT TIME ZONE ${timezone})
      ), owner_splits AS MATERIALIZED (
        SELECT r.period_index, s.owner_id, s.owner_amount, s.currency
        FROM rental_facts r
        JOIN v2_rental_owner_splits s
          ON s.rental_id = r.id AND s.tenant_id = r.tenant_id
      ), integrity AS (
        SELECT
          EXISTS (
            SELECT 1 FROM rental_facts r
            WHERE NOT COALESCE(
              r.confirmed_at IS NOT NULL
              AND r.snapshot_schema = ${ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA}
              AND r.snapshot_version IN (
                ${String(ACCEPTED_RENTAL_PRICING_SNAPSHOT_V2_VERSION)},
                ${String(ACCEPTED_RENTAL_PRICING_SNAPSHOT_V3_VERSION)}
              )
              AND r.currency ~ '^[A-Z]{3}$'
              AND r.equipment_amount >= 0 AND r.insurance_amount >= 0 AND r.delivery_amount >= 0
              AND r.equipment_amount::text NOT IN ('NaN', 'Infinity', '-Infinity')
              AND r.insurance_amount::text NOT IN ('NaN', 'Infinity', '-Infinity')
              AND r.delivery_amount::text NOT IN ('NaN', 'Infinity', '-Infinity')
              AND r.equipment_amount = r.before_insurance
              AND r.equipment_amount + r.insurance_amount = r.pricing_total
              AND r.pricing_total + r.delivery_amount = r.accepted_customer_total,
              false
            )
          ) OR EXISTS (
            SELECT 1 FROM owner_splits s
            WHERE trim(s.owner_id) = '' OR s.owner_amount < 0
              OR s.owner_amount::text IN ('NaN', 'Infinity', '-Infinity')
          ) AS invalid_facts,
          EXISTS (
            SELECT 1 FROM rental_facts r
            WHERE r.currency IS DISTINCT FROM ${currency}
              OR (r.fulfillment_method = 'DELIVERY' AND r.delivery_currency IS DISTINCT FROM ${currency})
          ) OR EXISTS (
            SELECT 1 FROM owner_splits s WHERE s.currency IS DISTINCT FROM ${currency}
          ) AS currency_mismatch
      ), rental_totals AS (
        SELECT COALESCE(period_index, 0) AS period_index, count(*) AS rental_count,
          sum(equipment_amount) AS equipment_amount,
          sum(insurance_amount) AS insurance_amount,
          sum(delivery_amount) AS delivery_amount
        FROM rental_facts GROUP BY GROUPING SETS ((period_index), ())
      ), owner_totals AS (
        SELECT COALESCE(period_index, 0) AS period_index, owner_id, sum(owner_amount) AS owner_amount
        FROM owner_splits GROUP BY GROUPING SETS ((period_index, owner_id), (owner_id))
      ), owner_summaries AS (
        SELECT period_index, sum(owner_amount) AS third_party_amount,
          jsonb_agg(jsonb_build_object('ownerId', owner_id, 'amount', owner_amount::text)
            ORDER BY owner_amount DESC, owner_id) AS owners
        FROM owner_totals GROUP BY period_index
      )
      SELECT p.period_index AS "periodIndex", COALESCE(r.rental_count, 0) AS "rentalCount",
        COALESCE(r.equipment_amount, 0)::text AS "equipmentAmount",
        COALESCE(r.insurance_amount, 0)::text AS "insuranceAmount",
        COALESCE(r.delivery_amount, 0)::text AS "deliveryAmount",
        COALESCE(o.third_party_amount, 0)::text AS "thirdPartyAmount",
        COALESCE(o.owners, '[]'::jsonb) AS owners,
        i.invalid_facts AS "invalidFacts", i.currency_mismatch AS "currencyMismatch"
      FROM generate_series(0, 12) AS p(period_index)
      LEFT JOIN rental_totals r ON r.period_index = p.period_index
      LEFT JOIN owner_summaries o ON o.period_index = p.period_index
      CROSS JOIN integrity i
      ORDER BY p.period_index
    `);
  }
}
