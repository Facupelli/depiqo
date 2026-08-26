import type { RentalCustomerOnboardingStatusDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from 'src/generated/prisma/client';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetRentalCustomersQuery } from './get-rental-customers.query';

export interface GetRentalCustomersItemReadModel {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: RentalCustomerOnboardingStatusDto;
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
    const where: Prisma.V2RentalCustomerWhereInput = {
      tenantId: query.tenantId,
      deletedAt: null,
      ...(query.status === undefined ? {} : { onboardingStatus: query.status }),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [customers, total] = await this.prisma.client.$transaction([
      this.prisma.client.v2RentalCustomer.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          onboardingStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
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
        status: customer.onboardingStatus,
        createdAt: customer.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
