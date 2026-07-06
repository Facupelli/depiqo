import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  createContractSignerApplicationError,
  CreateContractSignerApplicationError,
} from './create-contract-signer-application.error';
import { CreateContractSignerCommand } from './create-contract-signer.command';

export interface CreateContractSignerResult {
  id: string;
}

export type CreateContractSignerHandlerResult = Result<
  CreateContractSignerResult,
  CreateContractSignerApplicationError
>;

@CommandHandler(CreateContractSignerCommand)
export class CreateContractSignerHandler implements ICommandHandler<
  CreateContractSignerCommand,
  CreateContractSignerHandlerResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateContractSignerCommand): Promise<CreateContractSignerHandlerResult> {
    const existingSigner = await this.prisma.client.v2TenantContractSigner.findFirst({
      where: {
        tenantId: command.tenantId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingSigner) {
      return err(
        createContractSignerApplicationError(
          'ContractSignerAlreadyExists',
          `Tenant "${command.tenantId}" already has an active contract signer.`,
        ),
      );
    }

    const signer = await this.prisma.client.v2TenantContractSigner.create({
      data: {
        tenantId: command.tenantId,
        fullName: command.fullName,
        documentNumber: command.documentNumber,
        phone: command.phone,
        address: command.address,
        signatureUrl: command.signatureUrl,
        isDefault: true,
        isActive: true,
      },
      select: { id: true },
    });

    return ok({ id: signer.id });
  }
}
