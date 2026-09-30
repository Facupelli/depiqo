import { PrismaService } from 'src/core/database/prisma.service';
import { prismaDateToLocalDate } from 'src/core/temporal/local-date';

// Conservative authoring preflight. Only reject a conflict that is obvious
// without a rental: two unrestricted all-lines promotions with overlapping
// validity. The calculation remains the authoritative guard for all others.
export async function hasObviousPromotionPriorityConflict(
  prisma: PrismaService,
  input: {
    tenantId: string;
    promotionId?: string;
    priority: number;
    activation: 'AUTOMATIC' | 'COUPON_REQUIRED';
    isActive: boolean;
    validFrom?: string | null;
    validUntil?: string | null;
    minOrderSubtotal?: string | null;
    minRentalUnits?: number | null;
    maxRentalUnits?: number | null;
    scopes: Array<{ type: string }>;
    exclusions: readonly unknown[];
  },
): Promise<boolean> {
  if (
    !input.isActive ||
    input.exclusions.length ||
    !input.scopes.some((scope) => scope.type === 'ALL') ||
    input.minOrderSubtotal != null ||
    input.minRentalUnits != null ||
    input.maxRentalUnits != null
  )
    return false;

  const candidates = await prisma.client.v2Promotion.findMany({
    where: {
      tenantId: input.tenantId,
      priority: input.priority,
      isActive: true,
      deletedAt: null,
      ...(input.promotionId ? { id: { not: input.promotionId } } : {}),
      scopes: { some: { appliesToAll: true } },
      exclusions: { none: {} },
      minOrderSubtotal: null,
      minRentalUnits: null,
      maxRentalUnits: null,
    },
    select: { activation: true, validFrom: true, validUntil: true },
  });

  return candidates.some((candidate) => {
    if (candidate.activation === 'COUPON_REQUIRED' && input.activation === 'COUPON_REQUIRED') return false;
    const from = candidate.validFrom ? prismaDateToLocalDate(candidate.validFrom) : null;
    const until = candidate.validUntil ? prismaDateToLocalDate(candidate.validUntil) : null;
    return (
      !(input.validUntil && from && input.validUntil < from) && !(input.validFrom && until && input.validFrom > until)
    );
  });
}
