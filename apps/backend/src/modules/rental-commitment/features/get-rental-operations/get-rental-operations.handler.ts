import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { GetRentalOperationsResponseDto, RentalOperationSummaryDto } from '@repo/api-contracts';
import { Prisma } from 'src/generated/prisma/client';
import { V2FulfillmentMethod, V2RentalStatus } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/core/database/prisma.service';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { RentalCustomerProfileFacts } from 'src/modules/tenant-management/public-api/rental-customer-profile-facts.public-api';

import { GetRentalOperationsQuery } from './get-rental-operations.query';

export type GetRentalOperationsResult = GetRentalOperationsResponseDto;

type RawRentalOperationRow = {
  id: string;
  rentalNumber: number;
  fulfillmentMethod: V2FulfillmentMethod;
  scheduledAt: string;
  customerId: string | null;
};

@QueryHandler(GetRentalOperationsQuery)
export class GetRentalOperationsHandler implements IQueryHandler<GetRentalOperationsQuery, GetRentalOperationsResult> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchFacts: BranchFacts,
    private readonly rentalCustomerProfileFacts: RentalCustomerProfileFacts,
  ) {}

  async execute(query: GetRentalOperationsQuery): Promise<GetRentalOperationsResult> {
    const branchResult = await this.branchFacts.getBranchFacts({
      tenantId: query.tenantId,
      branchId: query.branchId,
    });

    if (branchResult.isErr()) {
      throw new Error(branchResult.error.message, { cause: branchResult.error });
    }

    const timezone = branchResult.value.effectiveTimezone;
    const rangeStart = Prisma.sql`(${query.from}::date)::timestamp AT TIME ZONE ${timezone}`;
    const rangeEnd = Prisma.sql`(${query.to}::date + 1)::timestamp AT TIME ZONE ${timezone}`;

    const [goingOutRows, comingBackRows] = await Promise.all([
      this.findMovements(query, 'period_start', rangeStart, rangeEnd),
      this.findMovements(query, 'period_end', rangeStart, rangeEnd),
    ]);

    const customerIds = [
      ...goingOutRows.map((row) => row.customerId),
      ...comingBackRows.map((row) => row.customerId),
    ].filter((customerId): customerId is string => customerId !== null);

    const rentalIds = [...new Set([...goingOutRows.map((row) => row.id), ...comingBackRows.map((row) => row.id)])];
    const [customerFacts, equipmentCountsByRentalId] = await Promise.all([
      this.rentalCustomerProfileFacts.getRentalCustomerProfileFactsBatch({
        tenantId: query.tenantId,
        rentalCustomerIds: [...new Set(customerIds)],
      }),
      this.findEquipmentCounts(query.tenantId, rentalIds),
    ]);
    const customersById = new Map(
      customerFacts.map((customer) => [
        customer.rentalCustomerId,
        { id: customer.rentalCustomerId, displayName: customer.fullName },
      ]),
    );

    return {
      goingOut: this.toSummaries(goingOutRows, customersById, equipmentCountsByRentalId),
      comingBack: this.toSummaries(comingBackRows, customersById, equipmentCountsByRentalId),
    };
  }

  private findMovements(
    query: GetRentalOperationsQuery,
    boundary: 'period_start' | 'period_end',
    rangeStart: Prisma.Sql,
    rangeEnd: Prisma.Sql,
  ): Promise<RawRentalOperationRow[]> {
    const boundarySql = boundary === 'period_start' ? Prisma.sql`r.period_start` : Prisma.sql`r.period_end`;
    const secondaryBoundarySql = boundary === 'period_start' ? Prisma.sql`r.period_end` : Prisma.sql`r.period_start`;

    return this.prisma.client.$queryRaw<RawRentalOperationRow[]>(Prisma.sql`
      SELECT
        r.id AS "id",
        r.rental_number AS "rentalNumber",
        r.fulfillment_method AS "fulfillmentMethod",
        to_char(${boundarySql} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "scheduledAt",
        r.customer_id AS "customerId"
      FROM v2_rentals r
      WHERE r.tenant_id = ${query.tenantId}
        AND r.branch_id = ${query.branchId}
        AND r.status = ${V2RentalStatus.CONFIRMED}::"V2RentalStatus"
        AND ${boundarySql} >= ${rangeStart}
        AND ${boundarySql} < ${rangeEnd}
      ORDER BY ${boundarySql} ASC, ${secondaryBoundarySql} ASC, r.created_at DESC, r.id ASC
    `);
  }

  private async findEquipmentCounts(tenantId: string, rentalIds: string[]): Promise<Map<string, number>> {
    if (rentalIds.length === 0) return new Map();

    const [demandAssignmentCounts, accessoryAssignmentCounts] = await Promise.all([
      this.prisma.client.v2AssignedAsset.groupBy({
        by: ['rentalId'],
        where: {
          tenantId,
          rentalId: { in: rentalIds },
          effectiveUntil: null,
        },
        _count: { _all: true },
      }),
      this.prisma.client.v2RentalAccessoryAssetAssignment.groupBy({
        by: ['rentalOrderId'],
        where: {
          tenantId,
          rentalOrderId: { in: rentalIds },
        },
        _count: { _all: true },
      }),
    ]);

    const countsByRentalId = new Map(demandAssignmentCounts.map(({ rentalId, _count }) => [rentalId, _count._all]));
    for (const { rentalOrderId, _count } of accessoryAssignmentCounts) {
      countsByRentalId.set(rentalOrderId, (countsByRentalId.get(rentalOrderId) ?? 0) + _count._all);
    }

    return countsByRentalId;
  }

  private toSummaries(
    rows: RawRentalOperationRow[],
    customersById: Map<string, { id: string; displayName: string }>,
    equipmentCountsByRentalId: Map<string, number>,
  ): RentalOperationSummaryDto[] {
    return rows.map((row) => ({
      id: row.id,
      rentalNumber: row.rentalNumber,
      customer: row.customerId ? (customersById.get(row.customerId) ?? null) : null,
      fulfillmentMethod: row.fulfillmentMethod,
      scheduledAt: new Date(row.scheduledAt).toISOString(),
      equipmentCount: equipmentCountsByRentalId.get(row.id) ?? 0,
    }));
  }
}
