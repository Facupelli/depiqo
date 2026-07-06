import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2RentalCustomerOnboardingStatus } from 'src/generated/prisma/enums';

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
    private readonly prisma: PrismaService,
    private readonly rentalRepository: RentalRepository,
  ) {}

  async execute(command: AssignCustomerToDraftRentalCommand): Promise<AssignCustomerToDraftRentalResult> {
    const rental = await this.rentalRepository.findById(command.tenantId, command.rentalId);

    if (!rental) {
      return err(
        assignCustomerToDraftRentalApplicationError('RentalNotFound', `Rental "${command.rentalId}" was not found.`),
      );
    }

    // TODO: Replace this cross-module Prisma validation with a tenant-management public API/facade.
    const customer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: {
        id: command.customerId,
        tenantId: command.tenantId,
        deletedAt: null,
        isActive: true,
        onboardingStatus: V2RentalCustomerOnboardingStatus.APPROVED,
      },
      select: { id: true },
    });

    if (!customer) {
      return err(
        assignCustomerToDraftRentalApplicationError(
          'CustomerNotFoundOrNotAssignable',
          `Customer "${command.customerId}" cannot be assigned to draft rental "${command.rentalId}".`,
        ),
      );
    }

    const assignedRental = rental.assignCustomer(command.customerId);
    if (assignedRental.isErr()) {
      return err(this.toApplicationError(assignedRental.error));
    }

    await this.rentalRepository.save(rental);

    return ok(undefined);
  }

  private toApplicationError(error: unknown): AssignCustomerToDraftRentalApplicationError {
    if (error instanceof RentalMustBeDraftToAssignCustomerError) {
      return assignCustomerToDraftRentalApplicationError('RentalMustBeDraft', error.message, error);
    }

    if (error instanceof RentalInvalidFieldError) {
      return assignCustomerToDraftRentalApplicationError('CustomerNotFoundOrNotAssignable', error.message, error);
    }

    return assignCustomerToDraftRentalApplicationError('Unexpected', 'An unexpected error occurred.', error);
  }
}
