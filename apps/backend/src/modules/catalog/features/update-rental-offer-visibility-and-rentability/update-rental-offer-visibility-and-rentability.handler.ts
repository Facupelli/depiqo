import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { lockRentableItem } from '../../application/lock-rentable-item';
import { PrismaRentalOfferRepository } from '../create-rentable-item-offering/prisma-rental-offer.repository';
import { UpdateRentalOfferVisibilityAndRentabilityCommand } from './update-rental-offer-visibility-and-rentability.command';
import {
  UpdateRentalOfferVisibilityAndRentabilityError,
  updateRentalOfferVisibilityAndRentabilityError,
} from './update-rental-offer-visibility-and-rentability.errors';

@CommandHandler(UpdateRentalOfferVisibilityAndRentabilityCommand)
export class UpdateRentalOfferVisibilityAndRentabilityHandler implements ICommandHandler<
  UpdateRentalOfferVisibilityAndRentabilityCommand,
  Result<void, UpdateRentalOfferVisibilityAndRentabilityError>
> {
  constructor(
    private readonly unitOfWork: PrismaUnitOfWork,
    private readonly rentalOfferRepository: PrismaRentalOfferRepository,
  ) {}

  async execute(
    command: UpdateRentalOfferVisibilityAndRentabilityCommand,
  ): Promise<Result<void, UpdateRentalOfferVisibilityAndRentabilityError>> {
    const context = {
      useCase: 'UpdateRentalOfferVisibilityAndRentability',
      tenantId: command.tenantId,
      rentalOfferId: command.rentalOfferId,
    };
    return this.unitOfWork.runInTransaction(async ({ tx }) => {
      // The offer lookup identifies the parent; read its state only after taking
      // the same tenant-scoped parent lock archive/restore will use in ticket 06.
      const reference = await tx.v2RentalOffer.findFirst({
        where: { id: command.rentalOfferId, tenantId: command.tenantId },
        select: { rentableItemId: true },
      });
      if (!reference) {
        return err(
          updateRentalOfferVisibilityAndRentabilityError(
            'catalog.rental_offer_not_found',
            `Rental offer "${command.rentalOfferId}" was not found.`,
            undefined,
            context,
          ),
        );
      }

      const item = await lockRentableItem(tx, command.tenantId, reference.rentableItemId);
      const rentalOffer = await this.rentalOfferRepository.load(command.tenantId, command.rentalOfferId, tx);
      if (!item || !rentalOffer) {
        return err(
          updateRentalOfferVisibilityAndRentabilityError(
            'catalog.rental_offer_not_found',
            `Rental offer "${command.rentalOfferId}" was not found.`,
            undefined,
            context,
          ),
        );
      }

      const firstPublishedAt = rentalOffer.updateSettings(command.props, item.archivedAt === null);
      await this.rentalOfferRepository.updateSettings(rentalOffer, command.props, firstPublishedAt, tx);
      return ok(undefined);
    });
  }
}
