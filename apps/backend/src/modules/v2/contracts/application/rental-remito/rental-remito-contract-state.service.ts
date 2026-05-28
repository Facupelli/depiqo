import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2ContractStatus } from 'src/generated/prisma/enums';

import { rentalRemitoApplicationError, RentalRemitoApplicationError } from './rental-remito-application.error';

export interface MarkRentalRemitoSigningRequestedInput {
  tenantId: string;
  contractId: string;
  signingRequestId: string;
}

export interface MarkRentalRemitoSignedInput {
  tenantId: string;
  contractId: string;
  signingRequestId: string;
  signedAt: Date;
}

@Injectable()
export class RentalRemitoContractStateService {
  constructor(private readonly prisma: PrismaService) {}

  async markSigningRequested(
    input: MarkRentalRemitoSigningRequestedInput,
  ): Promise<Result<void, RentalRemitoApplicationError>> {
    const contract = await this.prisma.client.v2Contract.findFirst({
      where: {
        id: input.contractId,
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!contract) {
      return err(
        rentalRemitoApplicationError(
          'RentalNotFound',
          `Contract "${input.contractId}" was not found for tenant "${input.tenantId}".`,
        ),
      );
    }

    if (contract.status === V2ContractStatus.SIGNED) {
      return err(
        rentalRemitoApplicationError(
          'RentalNotReady',
          `Contract "${input.contractId}" is already signed and cannot be moved back to SIGNING_REQUESTED.`,
        ),
      );
    }

    await this.prisma.client.v2Contract.update({
      where: {
        id: contract.id,
      },
      data: {
        status: V2ContractStatus.SIGNING_REQUESTED,
      },
    });

    void input.signingRequestId;

    return ok(undefined);
  }

  async markSigned(input: MarkRentalRemitoSignedInput): Promise<Result<void, RentalRemitoApplicationError>> {
    const contract = await this.prisma.client.v2Contract.findFirst({
      where: {
        id: input.contractId,
        tenantId: input.tenantId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!contract) {
      return err(
        rentalRemitoApplicationError(
          'RentalNotFound',
          `Contract "${input.contractId}" was not found for tenant "${input.tenantId}".`,
        ),
      );
    }

    if (contract.status === V2ContractStatus.VOID) {
      return err(
        rentalRemitoApplicationError('RentalNotReady', `Contract "${input.contractId}" is void and cannot be signed.`),
      );
    }

    if (contract.status === V2ContractStatus.SIGNED) {
      return ok(undefined);
    }

    await this.prisma.client.v2Contract.update({
      where: {
        id: contract.id,
      },
      data: {
        status: V2ContractStatus.SIGNED,
        signedAt: input.signedAt,
      },
    });

    void input.signingRequestId;

    return ok(undefined);
  }
}
