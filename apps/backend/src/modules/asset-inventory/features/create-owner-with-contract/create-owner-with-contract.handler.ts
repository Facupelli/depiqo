import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { CreateOwnerWithContractCommand } from './create-owner-with-contract.command';
import { CreateOwnerWithContractError, createOwnerWithContractError } from './create-owner-with-contract.errors';
import { validateOwnerContractTerms } from './owner-contract-terms';

export type CreateOwnerWithContractResult = Result<
  { ownerId: string; contractId: string },
  CreateOwnerWithContractError
>;

@CommandHandler(CreateOwnerWithContractCommand)
export class CreateOwnerWithContractHandler implements ICommandHandler<
  CreateOwnerWithContractCommand,
  CreateOwnerWithContractResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateOwnerWithContractCommand): Promise<CreateOwnerWithContractResult> {
    const invalidTerm = validateOwnerContractTerms(command);
    if (invalidTerm) {
      return err(
        createOwnerWithContractError(`Invalid contract ${invalidTerm.field}: ${invalidTerm.reason}.`, {
          field: `contract.${invalidTerm.field}`,
          reason: invalidTerm.reason,
        }),
      );
    }

    return this.prisma.client.$transaction(async (tx) => {
      const owner = await tx.v2AssetOwner.create({
        data: {
          tenantId: command.tenantId,
          name: command.ownerName,
        },
        select: { id: true },
      });

      const contract = await tx.v2OwnerContract.create({
        data: {
          tenantId: command.tenantId,
          ownerId: owner.id,
          basis: command.basis,
          ownerShare: command.ownerShare,
          rentalShare: command.rentalShare,
          validFrom: command.validFrom,
          validTo: command.validTo,
        },
        select: { id: true },
      });

      return ok({
        ownerId: owner.id,
        contractId: contract.id,
      });
    });
  }
}
