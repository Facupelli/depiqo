import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  RentalCustomerOperationalEligibility,
  RentalCustomerOperationalEligibilityResult,
} from './rental-customer-operational-eligibility.public-api';

@Injectable()
export class RentalCustomerOperationalEligibilityService extends RentalCustomerOperationalEligibility {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async evaluateRentalCustomerOperationalEligibility(input: {
    tenantId: string;
    rentalCustomerId: string;
  }): Promise<RentalCustomerOperationalEligibilityResult> {
    const customer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: { id: input.rentalCustomerId, tenantId: input.tenantId },
      select: { deletedAt: true, isActive: true },
    });

    if (!customer) return { eligible: false, reason: 'RentalCustomerNotFoundOrOutsideTenant' };
    if (customer.deletedAt) return { eligible: false, reason: 'RentalCustomerDeleted' };
    if (!customer.isActive) return { eligible: false, reason: 'RentalCustomerInactive' };
    return { eligible: true };
  }
}
