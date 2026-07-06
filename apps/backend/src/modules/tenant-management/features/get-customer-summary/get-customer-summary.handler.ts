import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  tenantManagementApplicationError,
  TenantManagementApplicationError,
} from '../tenant-management-application.error';
import { GetCustomerSummaryQuery } from './get-customer-summary.query';

export interface GetCustomerSummaryReadModel {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  isCompany: boolean;
  companyName: string | null;
  firstName: string;
  lastName: string;
}

export type GetCustomerSummaryResult = Result<GetCustomerSummaryReadModel, TenantManagementApplicationError>;

@QueryHandler(GetCustomerSummaryQuery)
export class GetCustomerSummaryHandler implements IQueryHandler<GetCustomerSummaryQuery, GetCustomerSummaryResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetCustomerSummaryQuery): Promise<GetCustomerSummaryResult> {
    const customer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: {
        id: query.customerId,
        tenantId: query.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        isActive: true,
        isCompany: true,
        companyName: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!customer) {
      return err(
        tenantManagementApplicationError(
          'RentalCustomerNotFound',
          `Rental customer "${query.customerId}" was not found.`,
        ),
      );
    }

    return ok({
      id: customer.id,
      displayName: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
      isActive: customer.isActive,
      isCompany: customer.isCompany,
      companyName: customer.companyName,
      firstName: customer.firstName,
      lastName: customer.lastName,
    });
  }
}
