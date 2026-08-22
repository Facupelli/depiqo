import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

export type AttachRatePlanToRentalOfferOperationError =
  | { code: 'RentalOfferNotFound'; message: string }
  | { code: 'RatePlanNotFound'; message: string }
  | { code: 'RatePlanInactive'; message: string };

export interface AttachRatePlanToRentalOfferOperationInput {
  tenantId: string;
  catalogRentalOfferId: string;
  ratePlanId: string;
}

export interface AttachRatePlanToRentalOfferOperationResult {
  rentalOfferPricingId: string;
  ratePlanId: string;
}

@Injectable()
export class AttachRatePlanToRentalOfferOperation {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {}

  async attachRatePlanToRentalOffer(
    input: AttachRatePlanToRentalOfferOperationInput,
  ): Promise<Result<AttachRatePlanToRentalOfferOperationResult, AttachRatePlanToRentalOfferOperationError>> {
    // Joins the caller's ambient transaction when one is active (e.g. Offering
    // Setup coordination); standalone calls open their own transaction. The
    // validation reads must run on the ambient tx client because the RentalOffer
    // and, in Offering Setup workflows, the RatePlan may have been created
    // earlier inside the same uncommitted transaction.
    return this.unitOfWork.runInTransaction(async ({ tx }) => {
      const [rentalOffer, ratePlan] = await Promise.all([
        tx.v2RentalOffer.findFirst({
          where: { id: input.catalogRentalOfferId, tenantId: input.tenantId },
          select: { id: true },
        }),
        tx.v2RatePlan.findFirst({
          where: { id: input.ratePlanId, tenantId: input.tenantId },
          select: { id: true, isActive: true },
        }),
      ]);

      if (!rentalOffer) {
        return err({ code: 'RentalOfferNotFound', message: 'The requested rental offer was not found.' });
      }

      if (!ratePlan) {
        return err({ code: 'RatePlanNotFound', message: 'The requested rate plan was not found.' });
      }

      if (!ratePlan.isActive) {
        return err({
          code: 'RatePlanInactive',
          message: 'The requested rate plan must be active before it can price a rental offer.',
        });
      }

      const rentalOfferPricing = await tx.v2RentalOfferPricing.upsert({
        where: { catalogRentalOfferId: input.catalogRentalOfferId },
        create: {
          tenantId: input.tenantId,
          catalogRentalOfferId: input.catalogRentalOfferId,
          ratePlanId: input.ratePlanId,
          isActive: true,
        },
        update: {
          ratePlanId: input.ratePlanId,
          isActive: true,
        },
        select: { id: true },
      });

      return ok({ rentalOfferPricingId: rentalOfferPricing.id, ratePlanId: input.ratePlanId });
    });
  }
}
