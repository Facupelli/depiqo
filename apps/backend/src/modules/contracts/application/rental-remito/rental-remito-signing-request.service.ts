import { Injectable } from '@nestjs/common';
import { Result, err, ok } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2ContractStatus, V2DocumentSigningRequestStatus } from 'src/generated/prisma/enums';

import { RENTAL_REMITO_ACCEPTANCE_TEXT_VERSION } from './rental-remito-acceptance-text.registry';
import { RentalRemitoApplicationError } from './rental-remito-application.error';

export interface CreateRentalRemitoSigningRequestInput {
  tenantId: string;
  contractId: string;
  unsignedArtifactId: string;
  recipientEmail: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CreateRentalRemitoSigningRequestResult {
  requestId: string;
  expiresAt: Date;
  reusedExistingRequest: boolean;
}

@Injectable()
export class RentalRemitoSigningRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrReuse(
    input: CreateRentalRemitoSigningRequestInput,
  ): Promise<Result<CreateRentalRemitoSigningRequestResult, RentalRemitoApplicationError>> {
    const artifact = await this.prisma.client.v2ContractArtifact.findFirst({
      where: {
        id: input.unsignedArtifactId,
        contractId: input.contractId,
        tenantId: input.tenantId,
        storageStatus: 'AVAILABLE',
        kind: 'UNSIGNED_PDF',
      },
      select: { id: true },
    });
    if (!artifact) return err({ code: 'RentalNotFound', message: 'Unsigned contract artifact was not found.' });

    const request = await this.prisma.client.$transaction(async (tx) => {
      const active = await tx.v2DocumentSigningRequest.findFirst({
        where: {
          tenantId: input.tenantId,
          contractId: input.contractId,
          unsignedArtifactId: input.unsignedArtifactId,
          status: {
            in: [
              V2DocumentSigningRequestStatus.PENDING,
              V2DocumentSigningRequestStatus.SENT,
              V2DocumentSigningRequestStatus.VIEWED,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (active && active.expiresAt && active.expiresAt > new Date()) {
        const updated = await tx.v2DocumentSigningRequest.update({
          where: { id: active.id },
          data: {
            signerEmail: input.recipientEmail,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
            status: V2DocumentSigningRequestStatus.PENDING,
          },
          select: { id: true, expiresAt: true },
        });
        return { requestId: updated.id, expiresAt: updated.expiresAt ?? input.expiresAt, reusedExistingRequest: true };
      }
      if (active)
        await tx.v2DocumentSigningRequest.update({
          where: { id: active.id },
          data: { status: V2DocumentSigningRequestStatus.EXPIRED },
        });
      const created = await tx.v2DocumentSigningRequest.create({
        data: {
          tenantId: input.tenantId,
          contractId: input.contractId,
          rentalId: (
            await tx.v2Contract.findUniqueOrThrow({ where: { id: input.contractId }, select: { rentalId: true } })
          ).rentalId,
          unsignedArtifactId: input.unsignedArtifactId,
          signerName: input.recipientEmail,
          signerEmail: input.recipientEmail,
          tokenHash: input.tokenHash,
          acceptanceTextVersion: RENTAL_REMITO_ACCEPTANCE_TEXT_VERSION,
          expiresAt: input.expiresAt,
          status: V2DocumentSigningRequestStatus.SENT,
        },
        select: { id: true, expiresAt: true },
      });
      await tx.v2Contract.update({
        where: { id: input.contractId },
        data: { status: V2ContractStatus.SIGNING_REQUESTED },
      });
      return { requestId: created.id, expiresAt: created.expiresAt ?? input.expiresAt, reusedExistingRequest: false };
    });

    return ok(request);
  }
}
