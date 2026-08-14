import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  RentalCustomerOperationalEligibility,
  RentalCustomerOperationalEligibilityResult,
} from 'src/modules/tenant-management/public-api/rental-customer-operational-eligibility.public-api';

import {
  RentalInvalidFieldError,
  RentalMustBeDraftToAssignCustomerError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalRepository } from '../../persistence/rental.repository';
import { AssignCustomerToDraftRentalCommand } from './assign-customer-to-draft-rental.command';
import {
  assignCustomerToDraftRentalError,
  AssignCustomerToDraftRentalError,
} from './assign-customer-to-draft-rental.errors';

export type AssignCustomerToDraftRentalResult = Result<void, AssignCustomerToDraftRentalError>;

@CommandHandler(AssignCustomerToDraftRentalCommand)
export class AssignCustomerToDraftRentalHandler implements ICommandHandler<
  AssignCustomerToDraftRentalCommand,
  AssignCustomerToDraftRentalResult
> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly rentalCustomerEligibility: RentalCustomerOperationalEligibility,
  ) {}

  async execute(command: AssignCustomerToDraftRentalCommand): Promise<AssignCustomerToDraftRentalResult> {
    const context = this.errorContext(command);
    const rental = await this.rentalRepository.findById(command.tenantId, command.rentalId);

    if (!rental) {
      return err(
        assignCustomerToDraftRentalError(
          'rental_commitment.rental_not_found',
          `Rental "${command.rentalId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    const customerValidation = await this.rentalCustomerEligibility.evaluateRentalCustomerOperationalEligibility({
      tenantId: command.tenantId,
      rentalCustomerId: command.customerId,
    });

    if (!customerValidation.eligible) {
      return err(
        assignCustomerToDraftRentalError(
          this.customerEligibilityErrorCode(customerValidation.reason),
          `Customer "${command.customerId}" cannot be assigned to draft rental "${command.rentalId}" because it is ${customerValidation.reason}.`,
          undefined,
          { ...context, customerEligibilityReason: customerValidation.reason },
        ),
      );
    }

    const assignedRental = rental.assignCustomer(command.customerId);
    if (assignedRental.isErr()) {
      return err(this.toApplicationError(assignedRental.error, context));
    }

    const saved = await this.rentalRepository.save(rental, { expectedVersion: rental.version });
    if (!saved) {
      return err(
        assignCustomerToDraftRentalError(
          'rental_commitment.rental_version_conflict',
          `Rental "${command.rentalId}" was modified by another request.`,
          undefined,
          context,
        ),
      );
    }

    return ok(undefined);
  }

  private errorContext(command: AssignCustomerToDraftRentalCommand): Record<string, unknown> {
    return {
      useCase: 'AssignCustomerToDraftRental',
      tenantId: command.tenantId,
      rentalId: command.rentalId,
      customerId: command.customerId,
    };
  }

  private customerEligibilityErrorCode(
    reason: Extract<RentalCustomerOperationalEligibilityResult, { eligible: false }>['reason'],
  ): AssignCustomerToDraftRentalError['code'] {
    switch (reason) {
      case 'RentalCustomerNotFoundOrOutsideTenant':
        return 'rental_commitment.customer_not_found_or_outside_tenant';
      case 'RentalCustomerDeleted':
        return 'rental_commitment.customer_deleted';
      case 'RentalCustomerInactive':
        return 'rental_commitment.customer_inactive';
    }
  }

  private toApplicationError(error: unknown, context: Record<string, unknown>): AssignCustomerToDraftRentalError {
    if (error instanceof RentalMustBeDraftToAssignCustomerError) {
      return assignCustomerToDraftRentalError('rental_commitment.rental_must_be_draft', error.message, error, context);
    }

    if (error instanceof RentalInvalidFieldError) {
      return assignCustomerToDraftRentalError('rental_commitment.invalid_customer', error.message, error, context);
    }

    throw error;
  }
}
