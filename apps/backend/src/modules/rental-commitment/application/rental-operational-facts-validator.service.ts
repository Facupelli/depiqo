import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { BranchScheduleEligibility } from 'src/modules/tenant-management/public-api/branch-schedule-eligibility.public-api';
import { RentalCustomerOperationalEligibility } from 'src/modules/tenant-management/public-api/rental-customer-operational-eligibility.public-api';
import { TenantOperationalFacts } from 'src/modules/tenant-management/public-api/tenant-operational-facts.public-api';

import {
  BranchUnavailableForRentalError,
  PickupTimeOutsideBranchScheduleError,
  ProfessionalConfirmedRentalCreationDisabledError,
  RentalCommitmentError,
  RentalCustomerUnavailableForRentalError,
  ReturnTimeOutsideBranchScheduleError,
  TenantUnavailableForRentalError,
  UnsupportedBranchFulfillmentMethodError,
} from '../domain/errors/rental-commitment.errors';
import { FulfillmentMethod } from '../domain/rental-status';

@Injectable()
export class RentalOperationalFactsValidatorService {
  constructor(
    private readonly tenantOperationalFacts: TenantOperationalFacts,
    private readonly branchFacts: BranchFacts,
    private readonly rentalCustomerEligibility: RentalCustomerOperationalEligibility,
    private readonly branchScheduleEligibility: BranchScheduleEligibility,
  ) {}

  async validateDraftFacts(input: {
    tenantId: string;
    branchId: string;
    rentalCustomerId?: string | null;
    fulfillmentMethod: FulfillmentMethod;
  }): Promise<Result<void, RentalCommitmentError>> {
    const tenant = await this.tenantOperationalFacts.getTenantOperationalFacts({ tenantId: input.tenantId });
    if (tenant.isErr()) return err(new TenantUnavailableForRentalError(input.tenantId));

    const branch = await this.branchFacts.getBranchFacts({ tenantId: input.tenantId, branchId: input.branchId });
    if (branch.isErr() || !branch.value.isActive || branch.value.isDeleted) {
      return err(new BranchUnavailableForRentalError(input.branchId));
    }
    if (input.fulfillmentMethod === FulfillmentMethod.Delivery && !branch.value.supportsDelivery) {
      return err(new UnsupportedBranchFulfillmentMethodError(input.branchId, input.fulfillmentMethod));
    }

    if (input.rentalCustomerId) {
      const customer = await this.rentalCustomerEligibility.evaluateRentalCustomerOperationalEligibility({
        tenantId: input.tenantId,
        rentalCustomerId: input.rentalCustomerId,
      });
      if (!customer.eligible) return err(new RentalCustomerUnavailableForRentalError(input.rentalCustomerId));
    }

    return ok(undefined);
  }

  async validateDirectConfirmedFacts(input: {
    tenantId: string;
    branchId: string;
    rentalCustomerId: string;
    fulfillmentMethod: FulfillmentMethod;
    pickupAt: Date;
    returnAt: Date;
  }): Promise<Result<void, RentalCommitmentError>> {
    const tenant = await this.tenantOperationalFacts.getTenantOperationalFacts({ tenantId: input.tenantId });
    if (tenant.isErr()) return err(new TenantUnavailableForRentalError(input.tenantId));
    if (tenant.value.bookingMode !== 'INSTANT_BOOK') {
      return err(new ProfessionalConfirmedRentalCreationDisabledError(input.tenantId));
    }

    const draftFacts = await this.validateBranchCustomerAndFulfillment(input);
    if (draftFacts.isErr()) return draftFacts;

    const pickup = await this.branchScheduleEligibility.evaluateBranchScheduleEligibility({
      tenantId: input.tenantId,
      branchId: input.branchId,
      operation: 'PICKUP',
      operationAt: input.pickupAt,
    });
    if (pickup.isErr()) return err(new BranchUnavailableForRentalError(input.branchId));
    if (!pickup.value.eligible) return err(new PickupTimeOutsideBranchScheduleError(input.branchId, input.pickupAt));

    const returnAt = await this.branchScheduleEligibility.evaluateBranchScheduleEligibility({
      tenantId: input.tenantId,
      branchId: input.branchId,
      operation: 'RETURN',
      operationAt: input.returnAt,
    });
    if (returnAt.isErr()) return err(new BranchUnavailableForRentalError(input.branchId));
    if (!returnAt.value.eligible) return err(new ReturnTimeOutsideBranchScheduleError(input.branchId, input.returnAt));

    return ok(undefined);
  }

  private async validateBranchCustomerAndFulfillment(input: {
    tenantId: string;
    branchId: string;
    rentalCustomerId: string;
    fulfillmentMethod: FulfillmentMethod;
  }): Promise<Result<void, RentalCommitmentError>> {
    const branch = await this.branchFacts.getBranchFacts({ tenantId: input.tenantId, branchId: input.branchId });
    if (branch.isErr() || !branch.value.isActive || branch.value.isDeleted) {
      return err(new BranchUnavailableForRentalError(input.branchId));
    }
    if (input.fulfillmentMethod === FulfillmentMethod.Delivery && !branch.value.supportsDelivery) {
      return err(new UnsupportedBranchFulfillmentMethodError(input.branchId, input.fulfillmentMethod));
    }
    const customer = await this.rentalCustomerEligibility.evaluateRentalCustomerOperationalEligibility({
      tenantId: input.tenantId,
      rentalCustomerId: input.rentalCustomerId,
    });
    if (!customer.eligible) return err(new RentalCustomerUnavailableForRentalError(input.rentalCustomerId));
    return ok(undefined);
  }
}
