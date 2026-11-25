import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';

export async function lockRentableItem(
  tx: PrismaTransactionClient,
  tenantId: string,
  rentableItemId: string,
): Promise<{ archivedAt: Date | null } | null> {
  const rows = await tx.$queryRaw<Array<{ archivedAt: Date | null }>>`
    SELECT archived_at AS "archivedAt"
    FROM v2_rentable_items
    WHERE id = ${rentableItemId} AND tenant_id = ${tenantId}
    FOR UPDATE
  `;
  return rows[0] ?? null;
}
