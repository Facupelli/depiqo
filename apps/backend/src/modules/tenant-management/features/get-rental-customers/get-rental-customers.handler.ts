import type { RentalCustomerOnboardingStatusDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from 'src/generated/prisma/client';

import { PrismaService } from 'src/core/database/prisma.service';

import { resolveCustomerDisplayIdentity } from '../../customer/customer-display-identity';
import { GetRentalCustomersQuery } from './get-rental-customers.query';

export interface GetRentalCustomersItemReadModel {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isCompany: boolean;
  primaryName: string | null;
  companyName: string | null;
  contactName: string | null;
  status: RentalCustomerOnboardingStatusDto;
  lastSubmittedAt: string | null;
  createdAt: string;
}

export interface GetRentalCustomersReadModel {
  data: GetRentalCustomersItemReadModel[];
  total: number;
  page: number;
  pageSize: number;
}

export type GetRentalCustomersResult = GetRentalCustomersReadModel;

@QueryHandler(GetRentalCustomersQuery)
export class GetRentalCustomersHandler implements IQueryHandler<GetRentalCustomersQuery, GetRentalCustomersResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetRentalCustomersQuery): Promise<GetRentalCustomersResult> {
    const search = query.search?.trim();
    const where: Prisma.V2RentalCustomerWhereInput = {
      tenantId: query.tenantId,
      deletedAt: null,
      ...(query.status === undefined ? {} : { onboardingStatus: query.status }),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(search ? { OR: customerIdentitySearch(search) } : {}),
    };

    const [customers, total] = await this.prisma.client.$transaction([
      this.prisma.client.v2RentalCustomer.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isCompany: true,
          companyName: true,
          profile: { select: { fullName: true, businessName: true } },
          onboardingStatus: true,
          createdAt: true,
          lastSubmittedAt: true,
        },
        orderBy:
          query.status === 'PENDING'
            ? [{ lastSubmittedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]
            : { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.client.v2RentalCustomer.count({ where }),
    ]);

    return {
      data: customers.map((customer) => ({
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        isCompany: customer.isCompany,
        ...resolveCustomerDisplayIdentity(customer),
        status: customer.onboardingStatus,
        lastSubmittedAt: customer.lastSubmittedAt?.toISOString() ?? null,
        createdAt: customer.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}

function customerIdentitySearch(search: string): Prisma.V2RentalCustomerWhereInput[] {
  const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });
  const tokens = search.split(/\s+/);

  return [
    { firstName: contains(search) },
    { lastName: contains(search) },
    { profile: { is: { fullName: contains(search) } } },
    { isCompany: true, companyName: contains(search) },
    { isCompany: true, profile: { is: { businessName: contains(search) } } },
    ...(tokens.length > 1
      ? [{ AND: tokens.map((token) => ({ OR: [{ firstName: contains(token) }, { lastName: contains(token) }] })) }]
      : []),
  ];
}
