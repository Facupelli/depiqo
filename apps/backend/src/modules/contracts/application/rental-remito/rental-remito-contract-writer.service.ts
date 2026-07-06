import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { rentalRemitoApplicationError, RentalRemitoApplicationError } from './rental-remito-application.error';
import { RentalRemitoSnapshot } from './rental-remito-snapshot';
import { V2ContractStatus } from 'src/generated/prisma/enums';

export interface UpsertGeneratedRentalRemitoContractInput {
  tenantId: string;
  rentalId: string;
  snapshot: RentalRemitoSnapshot;
  documentNumber: string;
}

export interface UpsertGeneratedRentalRemitoContractResult {
  contractId: string;
}

export type UpsertGeneratedRentalRemitoContractUseCaseResult = Result<
  UpsertGeneratedRentalRemitoContractResult,
  RentalRemitoApplicationError
>;

@Injectable()
export class RentalRemitoContractWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertGeneratedContract(
    input: UpsertGeneratedRentalRemitoContractInput,
  ): Promise<UpsertGeneratedRentalRemitoContractUseCaseResult> {
    const existingContract = await this.prisma.client.v2Contract.findUnique({
      where: {
        tenantId_rentalId: {
          tenantId: input.tenantId,
          rentalId: input.rentalId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingContract) {
      const contract = await this.prisma.client.v2Contract.create({
        data: {
          tenantId: input.tenantId,
          rentalId: input.rentalId,
          status: V2ContractStatus.GENERATED,
          documentNumber: input.documentNumber,
          generatedAt: new Date(),
          snapshot: input.snapshot,
        },
        select: {
          id: true,
        },
      });

      return ok({
        contractId: contract.id,
      });
    }

    if (existingContract.status === V2ContractStatus.SIGNED) {
      return err(
        rentalRemitoApplicationError(
          'ContractAlreadySigned',
          `Contract "${existingContract.id}" is already signed and cannot be regenerated for signing.`,
        ),
      );
    }

    await this.prisma.client.v2Contract.update({
      where: {
        id: existingContract.id,
      },
      data: {
        status: V2ContractStatus.GENERATED,
        documentNumber: input.documentNumber,
        generatedAt: new Date(),
        snapshot: input.snapshot,
      },
    });

    return ok({
      contractId: existingContract.id,
    });
  }
}
