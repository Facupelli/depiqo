import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  GetRentalLifecycleFactsInput,
  RentalLifecycleFacts,
  RentalLifecycleFactsError,
  RentalLifecycleFactsResult,
  RentalLifecycleStatus,
} from './rental-lifecycle-facts.public-api';

function rentalLifecycleFactsError(message: string): RentalLifecycleFactsError {
  return { code: 'RentalNotFound', message };
}

@Injectable()
export class RentalLifecycleFactsService extends RentalLifecycleFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getRentalLifecycleFacts(
    input: GetRentalLifecycleFactsInput,
  ): Promise<Result<RentalLifecycleFactsResult, RentalLifecycleFactsError>> {
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: {
        id: input.rentalId,
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        branchId: true,
        customerId: true,
        status: true,
        periodStart: true,
        periodEnd: true,
      },
    });

    if (!rental) {
      return err(rentalLifecycleFactsError(`Rental "${input.rentalId}" was not found for tenant "${input.tenantId}".`));
    }

    return ok({
      rentalId: rental.id,
      branchId: rental.branchId,
      rentalCustomerId: rental.customerId,
      status: rental.status as RentalLifecycleStatus,
      periodStart: rental.periodStart,
      periodEnd: rental.periodEnd,
    });
  }
}
