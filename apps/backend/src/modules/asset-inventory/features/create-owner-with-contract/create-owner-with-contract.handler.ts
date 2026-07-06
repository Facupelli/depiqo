import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { CreateOwnerWithContractCommand } from './create-owner-with-contract.command';

export interface CreateOwnerWithContractResult {
  ownerId: string;
  contractId: string;
}

@CommandHandler(CreateOwnerWithContractCommand)
export class CreateOwnerWithContractHandler implements ICommandHandler<
  CreateOwnerWithContractCommand,
  CreateOwnerWithContractResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateOwnerWithContractCommand): Promise<CreateOwnerWithContractResult> {
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

      return {
        ownerId: owner.id,
        contractId: contract.id,
      };
    });
  }
}
