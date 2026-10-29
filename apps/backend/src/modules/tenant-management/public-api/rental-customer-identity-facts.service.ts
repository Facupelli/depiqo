import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  GetRentalCustomerIdentityFactsBatchInput,
  RentalCustomerIdentityFact,
  RentalCustomerIdentityFacts,
} from './rental-customer-identity-facts.public-api';

@Injectable()
export class RentalCustomerIdentityFactsService extends RentalCustomerIdentityFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getRentalCustomerIdentityFactsBatch(
    input: GetRentalCustomerIdentityFactsBatchInput,
  ): Promise<RentalCustomerIdentityFact[]> {
    const rentalCustomerIds = [...new Set(input.rentalCustomerIds)];
    if (rentalCustomerIds.length === 0) return [];

    const customers = await this.prisma.client.v2RentalCustomer.findMany({
      where: { id: { in: rentalCustomerIds }, tenantId: input.tenantId, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        isCompany: true,
      },
    });

    return customers.map((customer) => ({
      rentalCustomerId: customer.id,
      displayName:
        customer.isCompany && customer.companyName
          ? customer.companyName
          : `${customer.firstName} ${customer.lastName}`.trim(),
      isCompany: customer.isCompany,
    }));
  }
}
