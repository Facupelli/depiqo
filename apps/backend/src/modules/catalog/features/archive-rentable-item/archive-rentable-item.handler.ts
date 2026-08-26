import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaRentableItemRepository } from '../create-rentable-item-offering/prisma-rentable-item.repository';
import { ArchiveRentableItemCommand } from './archive-rentable-item.command';
import { ArchiveRentableItemError, archiveRentableItemError } from './archive-rentable-item.errors';

@CommandHandler(ArchiveRentableItemCommand)
export class ArchiveRentableItemHandler implements ICommandHandler<
  ArchiveRentableItemCommand,
  Result<void, ArchiveRentableItemError>
> {
  constructor(private readonly rentableItemRepository: PrismaRentableItemRepository) {}

  async execute(command: ArchiveRentableItemCommand): Promise<Result<void, ArchiveRentableItemError>> {
    const context = this.errorContext(command);
    const rentableItem = await this.rentableItemRepository.load(command.tenantId, command.rentableItemId);

    if (!rentableItem) {
      return err(
        archiveRentableItemError(
          'catalog.rentable_item_not_found',
          `Rentable item "${command.rentableItemId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    const archiveResult = rentableItem.archive();
    if (archiveResult.isErr()) {
      throw archiveResult.error;
    }

    if (!archiveResult.value) {
      // Already archived: idempotent no-op, nothing to persist.
      return ok(undefined);
    }

    await this.rentableItemRepository.save(rentableItem);

    return ok(undefined);
  }

  private errorContext(command: ArchiveRentableItemCommand): Record<string, unknown> {
    return {
      useCase: 'ArchiveRentableItem',
      tenantId: command.tenantId,
      rentableItemId: command.rentableItemId,
    };
  }
}
