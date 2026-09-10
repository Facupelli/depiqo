import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

import { AttachRatePlanToRentalOfferOperation } from './attach-rate-plan-to-rental-offer.operation';
import {
  CreateRatePlanOperation,
  CreateRatePlanOperationError,
  CreateRatePlanOperationInput,
} from './create-rate-plan.operation';

export type CreatePricingForRentalOfferOperationError =
  | { code: 'RentalOfferNotFound'; message: string }
  | CreateRatePlanOperationError;

export interface CreatePricingForRentalOfferOperationInput {
  tenantId: string;
  catalogRentalOfferId: string;
  ratePlan: Omit<CreateRatePlanOperationInput, 'tenantId' | 'isActive'>;
}

export interface CreatePricingForRentalOfferOperationResult {
  catalogRentalOfferId: string;
  ratePlanId: string;
  rentalOfferPricingId: string;
}

@Injectable()
export class CreatePricingForRentalOfferOperation {
  constructor(
    private readonly unitOfWork: PrismaUnitOfWork,
    private readonly createRatePlanOperation: CreateRatePlanOperation,
    private readonly attachRatePlanOperation: AttachRatePlanToRentalOfferOperation,
  ) {}

  async createPricingForRentalOffer(
    input: CreatePricingForRentalOfferOperationInput,
  ): Promise<Result<CreatePricingForRentalOfferOperationResult, CreatePricingForRentalOfferOperationError>> {
    return this.unitOfWork.runResultInTransaction(async () => {
      const createdRatePlan = await this.createRatePlanOperation.createRatePlan({
        tenantId: input.tenantId,
        ...input.ratePlan,
        isActive: true,
      });

      if (createdRatePlan.isErr()) {
        return err(createdRatePlan.error);
      }

      const ratePlanId = createdRatePlan.value.ratePlan.id;
      const assignment = await this.attachRatePlanOperation.attachRatePlanToRentalOffer({
        tenantId: input.tenantId,
        catalogRentalOfferId: input.catalogRentalOfferId,
        ratePlanId,
      });

      if (assignment.isErr()) {
        switch (assignment.error.code) {
          case 'RentalOfferNotFound':
            return err(assignment.error);
          case 'RatePlanNotFound':
          case 'RatePlanInactive':
            throw new Error(
              `Newly-created Rate Plan failed assignment with invariant error "${assignment.error.code}".`,
              { cause: assignment.error },
            );
          default:
            return assertNever(assignment.error);
        }
      }

      return ok({
        catalogRentalOfferId: input.catalogRentalOfferId,
        ratePlanId,
        rentalOfferPricingId: assignment.value.rentalOfferPricingId,
      });
    });
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled Rate Plan assignment error: ${String(value)}`);
}
