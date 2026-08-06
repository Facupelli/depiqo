import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

import { CatalogRentalOfferArchivedError } from '../../domain/errors/catalog.errors';
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
    const rentalOffer = await this.rentalOfferRepository.load(command.tenantId, command.rentalOfferId);

    if (!rentalOffer) {
      return err(
        updateRentalOfferVisibilityAndRentabilityError(
          'catalog.rental_offer_not_found',
          `Rental offer "${command.rentalOfferId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    const updateResult = rentalOffer.updateVisibilityAndRentability(command.props);
    if (updateResult.isErr()) {
      if (updateResult.error instanceof CatalogRentalOfferArchivedError) {
        return err(
          updateRentalOfferVisibilityAndRentabilityError(
            'catalog.rental_offer_archived',
            updateResult.error.message,
            updateResult.error,
            context,
          ),
        );
      }
      throw updateResult.error;
    }

    await this.unitOfWork.runInTransaction(async ({ tx, events }) => {
      await this.rentalOfferRepository.save(rentalOffer, tx);
      events.collectFrom(rentalOffer);
    });

    return ok(undefined);
  }
}
