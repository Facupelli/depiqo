import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { isValidBufferMinutes } from 'src/core/domain/rental-asset-buffer';

import { UpdateBranchRentalAssetBufferCommand } from './update-branch-rental-asset-buffer.command';

type UpdateBranchRentalAssetBufferError = { code: 'BranchNotFound' | 'InvalidBufferMinutes'; message: string };
export type UpdateBranchRentalAssetBufferResult = Result<void, UpdateBranchRentalAssetBufferError>;

@CommandHandler(UpdateBranchRentalAssetBufferCommand)
export class UpdateBranchRentalAssetBufferHandler implements ICommandHandler<
  UpdateBranchRentalAssetBufferCommand,
  UpdateBranchRentalAssetBufferResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateBranchRentalAssetBufferCommand): Promise<UpdateBranchRentalAssetBufferResult> {
    const { tenantId, branchId, beforeBufferMinutes, afterBufferMinutes } = command;
    if (
      ![beforeBufferMinutes, afterBufferMinutes].every((value) => isValidBufferMinutes(value) && value <= 2147483647)
    ) {
      return err({
        code: 'InvalidBufferMinutes',
        message: 'Asset buffer minutes must be non-negative 32-bit integers.',
      });
    }

    const { count } = await this.prisma.client.v2Branch.updateMany({
      where: { id: branchId, tenantId, deletedAt: null, tenant: { status: 'ACTIVE', deletedAt: null } },
      data: {
        rentalAssetBeforeBufferMinutes: beforeBufferMinutes,
        rentalAssetAfterBufferMinutes: afterBufferMinutes,
      },
    });

    if (count === 0) return err({ code: 'BranchNotFound', message: `Branch "${branchId}" was not found.` });
    return ok(undefined);
  }
}
