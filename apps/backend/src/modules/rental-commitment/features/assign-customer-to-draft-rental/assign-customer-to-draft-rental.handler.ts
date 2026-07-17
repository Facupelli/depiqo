import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  StaffDraftRentalCustomerEligibilityReason,
  TenantManagementPublicApi,
} from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import {
  RentalInvalidFieldError,
  RentalMustBeDraftToAssignCustomerError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalRepository } from '../../persistence/rental.repository';
import { AssignCustomerToDraftRentalCommand } from './assign-customer-to-draft-rental.command';
import {
  assignCustomerToDraftRentalApplicationError,
  AssignCustomerToDraftRentalApplicationError,
} from './assign-customer-to-draft-rental-application.error';

export type AssignCustomerToDraftRentalResult = Result<void, AssignCustomerToDraftRentalApplicationError>;

@CommandHandler(AssignCustomerToDraftRentalCommand)
export class AssignCustomerToDraftRentalHandler implements ICommandHandler<
  AssignCustomerToDraftRentalCommand,
  AssignCustomerToDraftRentalResult
> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly tenantManagementApi: TenantManagementPublicApi,
  ) {}

  async execute(command: AssignCustomerToDraftRentalCommand): Promise<AssignCustomerToDraftRentalResult> {
    const context = this.errorContext(command);
    const rental = await this.rentalRepository.findById(command.tenantId, command.rentalId);

    if (!rental) {
      return err(
        assignCustomerToDraftRentalApplicationError(
          'rental-commitment.rental-not-found',
          `Rental "${command.rentalId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    const customerValidation = await this.tenantManagementApi.validateCustomerForStaffDraftRental({
      tenantId: command.tenantId,
      customerId: command.customerId,
    });

    if (!customerValidation.eligible) {
      return err(
        assignCustomerToDraftRentalApplicationError(
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

    await this.rentalRepository.save(rental);

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
    reason: StaffDraftRentalCustomerEligibilityReason,
  ): AssignCustomerToDraftRentalApplicationError['code'] {
    switch (reason) {
      case 'CustomerNotFoundOrOutsideTenant':
        return 'rental-commitment.customer-not-found-or-outside-tenant';
      case 'CustomerDeleted':
        return 'rental-commitment.customer-deleted';
      case 'CustomerInactive':
        return 'rental-commitment.customer-inactive';
    }
  }

  private toApplicationError(
    error: unknown,
    context: Record<string, unknown>,
  ): AssignCustomerToDraftRentalApplicationError {
    if (error instanceof RentalMustBeDraftToAssignCustomerError) {
      return assignCustomerToDraftRentalApplicationError(
        'rental-commitment.rental-must-be-draft',
        error.message,
        error,
        context,
      );
    }

    if (error instanceof RentalInvalidFieldError) {
      return assignCustomerToDraftRentalApplicationError(
        'rental-commitment.invalid-customer',
        error.message,
        error,
        context,
      );
    }

    throw error;
  }
}
