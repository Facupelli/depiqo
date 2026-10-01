import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { lockRentableItem } from '../../application/lock-rentable-item';
import { PrismaRentableItemRepository } from '../create-rentable-item-offering/prisma-rentable-item.repository';
import { RestoreRentableItemCommand } from './restore-rentable-item.command';
import { RestoreRentableItemError, restoreRentableItemError } from './restore-rentable-item.errors';

@CommandHandler(RestoreRentableItemCommand)
export class RestoreRentableItemHandler implements ICommandHandler<
  RestoreRentableItemCommand,
  Result<void, RestoreRentableItemError>
> {
  constructor(
    private readonly rentableItemRepository: PrismaRentableItemRepository,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: RestoreRentableItemCommand): Promise<Result<void, RestoreRentableItemError>> {
    return this.unitOfWork.runInTransaction(async ({ tx }) => {
      const locked = await lockRentableItem(tx, command.tenantId, command.rentableItemId);
      if (!locked) {
        return err(
          restoreRentableItemError(
            'catalog.rentable_item_not_found',
            `Rentable item "${command.rentableItemId}" was not found.`,
            undefined,
            { useCase: 'RestoreRentableItem', tenantId: command.tenantId, rentableItemId: command.rentableItemId },
          ),
        );
      }

      const rentableItem = await this.rentableItemRepository.load(command.tenantId, command.rentableItemId, tx);
      if (!rentableItem) throw new Error(`Locked rentable item "${command.rentableItemId}" could not be loaded.`);
      if (!rentableItem.restore()) return ok(undefined);

      const firstPublishedAt = new Date();
      await this.rentableItemRepository.saveArchivalState(rentableItem, tx);
      await tx.v2RentalOffer.updateMany({
        where: {
          tenantId: command.tenantId,
          rentableItemId: command.rentableItemId,
          showInStore: true,
          firstPublishedAt: null,
        },
        data: { firstPublishedAt },
      });
      return ok(undefined);
    });
  }
}
