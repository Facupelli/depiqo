import { Injectable } from '@nestjs/common';

import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';

@Injectable()
export class RentalNumberAllocator {
  async allocate(tenantId: string, tx: PrismaTransactionClient): Promise<number> {
    const rows = await tx.$queryRaw<{ rentalNumber: number }[]>`
      INSERT INTO v2_rental_number_counters (tenant_id, last_issued_number)
      VALUES (${tenantId}, 1)
      ON CONFLICT (tenant_id) DO UPDATE
      SET last_issued_number = v2_rental_number_counters.last_issued_number + 1,
          updated_at = CURRENT_TIMESTAMP
      RETURNING last_issued_number AS "rentalNumber"
    `;

    const rentalNumber = rows[0]?.rentalNumber;
    if (rentalNumber === undefined) {
      throw new Error(`Failed to allocate rental number for tenant "${tenantId}".`);
    }

    return rentalNumber;
  }
}
