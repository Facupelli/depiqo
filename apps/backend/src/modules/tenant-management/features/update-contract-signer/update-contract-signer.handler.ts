import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { UpdateContractSignerError, updateContractSignerError } from './update-contract-signer.errors';
import { UpdateContractSignerCommand } from './update-contract-signer.command';

export interface UpdateContractSignerResult {
  id: string;
}

export type UpdateContractSignerHandlerResult = Result<UpdateContractSignerResult, UpdateContractSignerError>;

@CommandHandler(UpdateContractSignerCommand)
export class UpdateContractSignerHandler implements ICommandHandler<
  UpdateContractSignerCommand,
  UpdateContractSignerHandlerResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateContractSignerCommand): Promise<UpdateContractSignerHandlerResult> {
    const context = {
      useCase: 'UpdateContractSigner',
      tenantId: command.tenantId,
    };
    const existingSigner = await this.prisma.client.v2TenantContractSigner.findFirst({
      where: {
        tenantId: command.tenantId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existingSigner) {
      return err(
        updateContractSignerError(
          'tenant_management.contract_signer_not_found',
          `Tenant "${command.tenantId}" does not have an active contract signer.`,
          undefined,
          context,
        ),
      );
    }

    const signer = await this.prisma.client.v2TenantContractSigner.update({
      where: { id: existingSigner.id },
      data: {
        fullName: command.fullName,
        documentNumber: command.documentNumber,
        phone: command.phone,
        address: command.address,
        signatureUrl: command.signatureUrl,
      },
      select: { id: true },
    });

    return ok({ id: signer.id });
  }
}
