import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { V2RentalStatus } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/core/database/prisma.service';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import { GetRentalsCalendarQuery } from './get-rentals-calendar.query';

const RENTAL_CALENDAR_STATUSES = [
  V2RentalStatus.PENDING,
  V2RentalStatus.DRAFT,
  V2RentalStatus.CONFIRMED,
  V2RentalStatus.PREPARED,
] as const;

type RentalCalendarStatus = (typeof RENTAL_CALENDAR_STATUSES)[number];

export interface RentalsCalendarCustomerReadModel {
  id: string;
  displayName: string;
  isCompany: boolean;
}

export interface RentalsCalendarItemReadModel {
  id: string;
  number: string;
  status: RentalCalendarStatus;
  createdAt: string;
  pickupAt: string;
  returnAt: string;
  pickupDate: string;
  returnDate: string;
  customer: RentalsCalendarCustomerReadModel | null;
}

export type GetRentalsCalendarResult = RentalsCalendarItemReadModel[];

@QueryHandler(GetRentalsCalendarQuery)
export class GetRentalsCalendarHandler implements IQueryHandler<GetRentalsCalendarQuery, GetRentalsCalendarResult> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantManagementApi: TenantManagementPublicApi,
  ) {}

  async execute(query: GetRentalsCalendarQuery): Promise<GetRentalsCalendarResult> {
    const timezone = await this.resolveCalendarTimezone(query.tenantId, query.branchId);

    const rentals = await this.prisma.client.v2Rental.findMany({
      where: {
        tenantId: query.tenantId,
        branchId: query.branchId,
        status: { in: [...RENTAL_CALENDAR_STATUSES] },
        periodStart: { lt: query.to },
        periodEnd: { gt: query.from },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        periodStart: true,
        periodEnd: true,
        customerId: true,
      },
      orderBy: [{ periodStart: 'asc' }, { periodEnd: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
    });

    const customersById = await this.getCustomersById(
      query.tenantId,
      rentals.map((rental) => rental.customerId).filter((customerId): customerId is string => customerId !== null),
    );

    return rentals.map((rental) => {
      const customer = rental.customerId ? (customersById.get(rental.customerId) ?? null) : null;

      return {
        id: rental.id,
        number: rental.id.slice(0, 4),
        status: rental.status as RentalCalendarStatus,
        createdAt: rental.createdAt.toISOString(),
        pickupAt: rental.periodStart.toISOString(),
        returnAt: rental.periodEnd.toISOString(),
        pickupDate: this.toDateKey(rental.periodStart, timezone),
        returnDate: this.toDateKey(rental.periodEnd, timezone),
        customer,
      };
    });
  }

  private async resolveCalendarTimezone(tenantId: string, branchId: string): Promise<string> {
    const branchContext = await this.tenantManagementApi.getBranchContext({ tenantId, branchId });

    if (branchContext.isErr()) {
      throw new Error(branchContext.error.message, { cause: branchContext.error });
    }

    return branchContext.value.effectiveTimezone;
  }

  private async getCustomersById(
    tenantId: string,
    customerIds: readonly string[],
  ): Promise<Map<string, RentalsCalendarCustomerReadModel>> {
    const uniqueCustomerIds = [...new Set(customerIds)];

    if (uniqueCustomerIds.length === 0) {
      return new Map();
    }

    const customers = await this.prisma.client.v2RentalCustomer.findMany({
      where: {
        tenantId,
        id: { in: uniqueCustomerIds },
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        isCompany: true,
      },
    });

    return new Map(
      customers.map((customer) => [
        customer.id,
        {
          id: customer.id,
          displayName: this.resolveCustomerDisplayName(customer),
          isCompany: customer.isCompany,
        },
      ]),
    );
  }

  private resolveCustomerDisplayName(customer: {
    firstName: string;
    lastName: string;
    companyName: string | null;
    isCompany: boolean;
  }): string {
    if (customer.isCompany && customer.companyName) {
      return customer.companyName;
    }

    return `${customer.firstName} ${customer.lastName}`.trim();
  }

  private toDateKey(date: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    return `${year}-${month}-${day}`;
  }
}
