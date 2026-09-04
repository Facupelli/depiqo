import { AppliedPromotion } from '../promotions/applied-promotion.type';
import { PricingContext } from './pricing-context.types';
import { PricingResult } from './pricing-result.type';

type PricingResultAssemblerInput = {
  context: PricingContext;
  appliedPromotions: AppliedPromotion[];
};

export class PricingResultAssembler {
  assemble(input: PricingResultAssemblerInput): PricingResult {
    const { context, appliedPromotions } = input;

    const appliedCouponPromotion = appliedPromotions.find(
      (appliedPromotion) => appliedPromotion.adjustmentType === 'COUPON',
    );

    return {
      currency: context.currency,
      subtotal: context.subtotal.toSnapshotString(),
      discountTotal: context.discountTotal.toSnapshotString(),
      total: context.total.toSnapshotString(),
      chargedDays: context.chargedDays,
      durationPolicySnapshot: context.durationPolicySnapshot,
      lines: context.lines.map((line) => ({
        rentalSelectionId: line.rentalSelectionId,
        rentalOfferId: line.rentalOfferId,
        rentableItemId: line.rentableItemId,
        rentableItemName: line.rentableItemName,
        rentableItemKind: line.rentableItemKind,
        categoryId: line.categoryId,
        quantity: line.quantity,
        chargedUnits: line.chargedUnits,
        billingUnit: line.billingUnit,
        ratePlanId: line.ratePlanId,
        appliedTierId: line.appliedTierId,
        pricePerUnit: line.pricePerUnit.toSnapshotString(),
        subtotal: line.subtotal.toSnapshotString(),
        discountTotal: line.discountTotal.toSnapshotString(),
        total: line.total.toSnapshotString(),
        appliedAdjustments: line.appliedAdjustments.map((adjustment) => ({
          type: adjustment.type,
          promotionId: adjustment.promotionId,
          couponId: adjustment.couponId,
          name: adjustment.name,
          amount: adjustment.amount.toSnapshotString(),
        })),
      })),
      appliedPromotions: appliedPromotions.map((appliedPromotion) => ({
        promotionId: appliedPromotion.promotion.id,
        name: appliedPromotion.promotion.name,
        activation: appliedPromotion.promotion.activation,
        effectType: appliedPromotion.promotion.effectType,
        effectValue: appliedPromotion.promotion.effectValue,
        amount: appliedPromotion.amount.toSnapshotString(),
        affectedLineReferences: context.lines.flatMap((line) =>
          line.appliedAdjustments.some(
            (adjustment) => adjustment.promotionId === appliedPromotion.promotion.id && !adjustment.amount.isZero(),
          )
            ? [line.rentalSelectionId]
            : [],
        ),
      })),
      appliedCoupon: appliedCouponPromotion
        ? {
            couponId: appliedCouponPromotion.couponId!,
            code: appliedCouponPromotion.couponCode!,
            promotionId: appliedCouponPromotion.promotion.id,
            amount: appliedCouponPromotion.amount.toSnapshotString(),
          }
        : undefined,
    };
  }
}
