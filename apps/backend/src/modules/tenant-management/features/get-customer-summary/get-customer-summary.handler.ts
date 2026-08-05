import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetCustomerSummaryError, getCustomerSummaryError } from './get-customer-summary.errors';
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

export type GetCustomerSummaryResult = Result<GetCustomerSummaryReadModel, GetCustomerSummaryError>;

@QueryHandler(GetCustomerSummaryQuery)
export class GetCustomerSummaryHandler implements IQueryHandler<GetCustomerSummaryQuery, GetCustomerSummaryResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetCustomerSummaryQuery): Promise<GetCustomerSummaryResult> {
    const context = {
      useCase: 'GetCustomerSummary',
      tenantId: query.tenantId,
      customerId: query.customerId,
    };
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
        getCustomerSummaryError(
          'tenant_management.rental_customer_not_found',
          `Rental customer "${query.customerId}" was not found.`,
          undefined,
          context,
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
