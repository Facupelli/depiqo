import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import { RentalCustomerContactFact, RentalCustomerContactFacts } from './rental-customer-contact-facts.public-api';

@Injectable()
export class RentalCustomerContactFactsService extends RentalCustomerContactFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getRentalCustomerContactFacts(input: {
    tenantId: string;
    rentalCustomerId: string;
  }): Promise<RentalCustomerContactFact | null> {
    const customer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: {
        id: input.rentalCustomerId,
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!customer) return null;

    return {
      rentalCustomerId: customer.id,
      email: customer.email,
      isActive: customer.isActive,
      isDeleted: customer.deletedAt !== null,
    };
  }
}
