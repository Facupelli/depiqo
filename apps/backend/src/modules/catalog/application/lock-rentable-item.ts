import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';

/**
 * Serialize offer publication with item archive/restore. All three workflows
 * must lock the tenant-scoped parent before reading or writing offer state.
 * Catalog offer creation, edits, archive and restore use this lock.
 */
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
