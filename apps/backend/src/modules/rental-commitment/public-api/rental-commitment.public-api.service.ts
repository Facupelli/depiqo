import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { FulfillmentMethod, RentalStatus } from '../domain/rental-status';
import {
  GetRentalNotificationContextInput,
  RentalCommitmentPublicApi,
  RentalCommitmentPublicApiError,
  RentalNotificationContext,
} from './rental-commitment.public-api';

function rentalCommitmentPublicApiError(
  code: RentalCommitmentPublicApiError['code'],
  message: string,
  cause?: unknown,
): RentalCommitmentPublicApiError {
  return { code, message, cause };
}

@Injectable()
export class RentalCommitmentPublicApiService extends RentalCommitmentPublicApi {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getRentalNotificationContext(
    input: GetRentalNotificationContextInput,
  ): Promise<Result<RentalNotificationContext, RentalCommitmentPublicApiError>> {
    const rental = await this.prisma.client.v2Rental.findFirst({
      where: {
        id: input.rentalId,
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        customerId: true,
        status: true,
        fulfillmentMethod: true,
        periodStart: true,
        periodEnd: true,
      },
    });

    if (!rental) {
      return err(
        rentalCommitmentPublicApiError(
          'RentalNotFound',
          `Rental "${input.rentalId}" was not found for tenant "${input.tenantId}".`,
        ),
      );
    }

    return ok({
      rentalId: rental.id,
      rentalNumber: rental.id.slice(0, 4),
      tenantId: rental.tenantId,
      branchId: rental.branchId,
      rentalCustomerId: rental.customerId,
      status: rental.status as RentalStatus,
      fulfillmentMethod: (rental.fulfillmentMethod as FulfillmentMethod | null) ?? FulfillmentMethod.Pickup,
      periodStart: rental.periodStart,
      periodEnd: rental.periodEnd,
    });
  }
}
