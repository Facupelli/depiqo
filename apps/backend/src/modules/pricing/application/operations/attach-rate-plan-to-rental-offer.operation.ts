import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

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
}

@Injectable()
export class AttachRatePlanToRentalOfferOperation {
  constructor(private readonly prisma: PrismaService) {}

  async attachRatePlanToRentalOffer(
    input: AttachRatePlanToRentalOfferOperationInput,
  ): Promise<Result<AttachRatePlanToRentalOfferOperationResult, AttachRatePlanToRentalOfferOperationError>> {
    const [rentalOffer, ratePlan] = await Promise.all([
      this.prisma.client.v2RentalOffer.findFirst({
        where: { id: input.catalogRentalOfferId, tenantId: input.tenantId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.client.v2RatePlan.findFirst({
        where: { id: input.ratePlanId, tenantId: input.tenantId, deletedAt: null },
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

    const rentalOfferPricing = await this.prisma.client.v2RentalOfferPricing.upsert({
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
        deletedAt: null,
      },
      select: { id: true },
    });

    return ok({ rentalOfferPricingId: rentalOfferPricing.id });
  }
}
