import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { lockRentableItem } from '../../application/lock-rentable-item';
import { PrismaRentableItemRepository } from '../create-rentable-item-offering/prisma-rentable-item.repository';
import { ArchiveRentableItemCommand } from './archive-rentable-item.command';
import { ArchiveRentableItemError, archiveRentableItemError } from './archive-rentable-item.errors';

@CommandHandler(ArchiveRentableItemCommand)
export class ArchiveRentableItemHandler implements ICommandHandler<
  ArchiveRentableItemCommand,
  Result<void, ArchiveRentableItemError>
> {
  constructor(
    private readonly rentableItemRepository: PrismaRentableItemRepository,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: ArchiveRentableItemCommand): Promise<Result<void, ArchiveRentableItemError>> {
    const context = this.errorContext(command);
    return this.unitOfWork.runInTransaction(async ({ tx }) => {
      const locked = await lockRentableItem(tx, command.tenantId, command.rentableItemId);
      if (!locked) {
        return err(
          archiveRentableItemError(
            'catalog.rentable_item_not_found',
            `Rentable item "${command.rentableItemId}" was not found.`,
            undefined,
            context,
          ),
        );
      }

      const rentableItem = await this.rentableItemRepository.load(command.tenantId, command.rentableItemId, tx);
      if (!rentableItem) throw new Error(`Locked rentable item "${command.rentableItemId}" could not be loaded.`);
      const archiveResult = rentableItem.archive();
      if (archiveResult.isErr()) throw archiveResult.error;
      if (archiveResult.value) await this.rentableItemRepository.saveArchivalState(rentableItem, tx);

      return ok(undefined);
    });
  }

  private errorContext(command: ArchiveRentableItemCommand) {
    return {
      useCase: 'ArchiveRentableItem',
      tenantId: command.tenantId,
      rentableItemId: command.rentableItemId,
    };
  }
}
