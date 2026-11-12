import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';
import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import {
  RentalCannotBeEditedFromStatusError,
  RentalInvalidFieldError,
  RentalPeriodHasEndedError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalRepository } from '../../persistence/rental.repository';
import { ChangeConfirmedRentalDeliveryAgreementCommand } from './change-confirmed-rental-delivery-agreement.command';
import {
  ChangeConfirmedRentalDeliveryAgreementError,
  changeConfirmedRentalDeliveryAgreementError,
} from './change-confirmed-rental-delivery-agreement.errors';

export type ChangeConfirmedRentalDeliveryAgreementResult = Result<
  { rentalId: string; version: number; updatedAt: Date },
  ChangeConfirmedRentalDeliveryAgreementError
>;

@CommandHandler(ChangeConfirmedRentalDeliveryAgreementCommand)
export class ChangeConfirmedRentalDeliveryAgreementHandler implements ICommandHandler<
  ChangeConfirmedRentalDeliveryAgreementCommand,
  ChangeConfirmedRentalDeliveryAgreementResult
> {
  constructor(
    private readonly rentals: RentalRepository,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(
    command: ChangeConfirmedRentalDeliveryAgreementCommand,
  ): Promise<ChangeConfirmedRentalDeliveryAgreementResult> {
    const { tenantId, tenantUserId, rentalId, expectedVersion, agreement } = command.props;
    const context = { useCase: 'ChangeConfirmedRentalDeliveryAgreement', tenantId, tenantUserId, rentalId };
    const failure = (code: ChangeConfirmedRentalDeliveryAgreementError['code'], message: string, cause?: unknown) =>
      err(changeConfirmedRentalDeliveryAgreementError(code, message, cause, context));
    const notFound = () => failure('rental_commitment.rental_not_found', `Rental "${rentalId}" was not found.`);
    const conflict = () =>
      failure('rental_commitment.rental_version_conflict', `Rental "${rentalId}" was modified by another request.`);

    const initial = await this.rentals.findById(tenantId, rentalId);
    if (!initial) return notFound();
    if (initial.version !== expectedVersion) return conflict();

    return this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
      const current = await this.rentals.findById(tenantId, rentalId, tx);
      if (!current) return notFound();
      if (current.version !== expectedVersion) return conflict();

      const changed = current.changeConfirmedDeliveryAgreement({ agreement, tenantUserId, operationTime: new Date() });
      if (changed.isErr()) {
        const error = changed.error;
        if (error instanceof RentalCannotBeEditedFromStatusError)
          return failure('rental_commitment.rental_cannot_be_edited_from_status', error.message, error);
        if (error instanceof RentalPeriodHasEndedError)
          return failure('rental_commitment.rental_period_ended', error.message, error);
        if (error instanceof RentalInvalidFieldError)
          return failure('rental_commitment.invalid_rental_field', error.message, error);
        throw error;
      }
      if (changed.value === 'UNCHANGED') {
        return ok({ rentalId, version: current.version, updatedAt: current.updatedAt! });
      }
      const saved = await this.rentals.save(current, { persistence: 'DETAILS', expectedVersion, tx });
      if (!saved) return conflict();
      integrationEvents.collect(toRentalIntegrationEvents(current.pullDomainEvents()));
      return ok({ rentalId, version: saved.version, updatedAt: saved.updatedAt });
    });
  }
}
