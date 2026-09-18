import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import { RentalCustomerProfileFact, RentalCustomerProfileFacts } from './rental-customer-profile-facts.public-api';

@Injectable()
export class RentalCustomerProfileFactsService extends RentalCustomerProfileFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getRentalCustomerProfileFacts(input: {
    tenantId: string;
    rentalCustomerId: string;
  }): Promise<RentalCustomerProfileFact | null> {
    const facts = await this.getRentalCustomerProfileFactsBatch({
      tenantId: input.tenantId,
      rentalCustomerIds: [input.rentalCustomerId],
    });

    return facts[0] ?? null;
  }

  async getRentalCustomerProfileFactsBatch(input: {
    tenantId: string;
    rentalCustomerIds: string[];
  }): Promise<RentalCustomerProfileFact[]> {
    const rentalCustomerIds = [...new Set(input.rentalCustomerIds)];
    if (rentalCustomerIds.length === 0) return [];

    const customers = await this.prisma.client.v2RentalCustomer.findMany({
      where: { id: { in: rentalCustomerIds }, tenantId: input.tenantId, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isCompany: true,
        companyName: true,
        profile: {
          select: { fullName: true, businessName: true, documentNumber: true, address: true, phone: true },
        },
      },
    });

    return customers.map((customer) => ({
      rentalCustomerId: customer.id,
      fullName: customer.isCompany
        ? (customer.profile?.businessName ??
          customer.companyName ??
          customer.profile?.fullName ??
          `${customer.firstName} ${customer.lastName}`.trim())
        : (customer.profile?.fullName ?? `${customer.firstName} ${customer.lastName}`.trim()),
      documentNumber: customer.profile?.documentNumber ?? null,
      address: customer.profile?.address ?? null,
      phone: customer.profile?.phone ?? null,
    }));
  }
}
