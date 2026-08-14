import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  RetainedRentalCustomerProfileFact,
  RetainedRentalCustomerProfileFacts,
} from './retained-rental-customer-profile-facts.public-api';

@Injectable()
export class RetainedRentalCustomerProfileFactsService extends RetainedRentalCustomerProfileFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getRetainedRentalCustomerProfileFacts(input: {
    tenantId: string;
    rentalCustomerId: string;
  }): Promise<RetainedRentalCustomerProfileFact | null> {
    const customer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: { id: input.rentalCustomerId, tenantId: input.tenantId },
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

    if (!customer) return null;

    return {
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
    };
  }
}
