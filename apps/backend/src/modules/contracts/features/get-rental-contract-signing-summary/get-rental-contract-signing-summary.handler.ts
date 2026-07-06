import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { GetRentalContractSigningSummaryResponseDto } from '@repo/api-contracts';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2ContractArtifactKind } from 'src/generated/prisma/enums';

import { GetRentalContractSigningSummaryQuery } from './get-rental-contract-signing-summary.query';

export type GetRentalContractSigningSummaryResult = GetRentalContractSigningSummaryResponseDto;

type SummaryArtifact = GetRentalContractSigningSummaryResponseDto['artifacts']['unsignedPdf'];

@QueryHandler(GetRentalContractSigningSummaryQuery)
export class GetRentalContractSigningSummaryHandler implements IQueryHandler<
  GetRentalContractSigningSummaryQuery,
  GetRentalContractSigningSummaryResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetRentalContractSigningSummaryQuery): Promise<GetRentalContractSigningSummaryResult> {
    const contract = await this.prisma.client.v2Contract.findFirst({
      where: {
        tenantId: query.tenantId,
        rentalId: query.rentalId,
      },
      select: {
        id: true,
        rentalId: true,
        status: true,
        documentNumber: true,
        signingRequests: {
          select: {
            id: true,
            status: true,
            signerName: true,
            signerEmail: true,
            signerPhone: true,
            sentAt: true,
            viewedAt: true,
            signedAt: true,
            expiresAt: true,
            cancelledAt: true,
            failedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        acceptances: {
          select: {
            id: true,
            signerName: true,
            signerEmail: true,
            acceptedAt: true,
            acceptedIpAddress: true,
            acceptanceTextVersion: true,
          },
          orderBy: { acceptedAt: 'desc' },
          take: 1,
        },
        artifacts: {
          select: {
            id: true,
            kind: true,
            fileName: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contract) {
      return {
        contractId: null,
        rentalId: query.rentalId,
        contractStatus: 'NOT_GENERATED',
        documentNumber: null,
        latestSigningRequest: null,
        acceptance: null,
        artifacts: {
          unsignedPdf: null,
          signedPdf: null,
        },
      };
    }

    const latestSigningRequest = contract.signingRequests[0] ?? null;
    const acceptance = contract.acceptances[0] ?? null;

    return {
      contractId: contract.id,
      rentalId: contract.rentalId,
      contractStatus: contract.status,
      documentNumber: contract.documentNumber,
      latestSigningRequest: latestSigningRequest
        ? {
            id: latestSigningRequest.id,
            status: latestSigningRequest.status,
            signerName: latestSigningRequest.signerName,
            signerEmail: latestSigningRequest.signerEmail,
            signerPhone: latestSigningRequest.signerPhone,
            sentAt: latestSigningRequest.sentAt?.toISOString() ?? null,
            viewedAt: latestSigningRequest.viewedAt?.toISOString() ?? null,
            signedAt: latestSigningRequest.signedAt?.toISOString() ?? null,
            expiresAt: latestSigningRequest.expiresAt?.toISOString() ?? null,
            cancelledAt: latestSigningRequest.cancelledAt?.toISOString() ?? null,
            failedAt: latestSigningRequest.failedAt?.toISOString() ?? null,
          }
        : null,
      acceptance: acceptance
        ? {
            id: acceptance.id,
            signerName: acceptance.signerName,
            signerEmail: acceptance.signerEmail,
            acceptedAt: acceptance.acceptedAt.toISOString(),
            acceptedIpAddress: acceptance.acceptedIpAddress,
            acceptanceTextVersion: acceptance.acceptanceTextVersion,
          }
        : null,
      artifacts: {
        unsignedPdf: this.findLatestArtifact(contract.artifacts, V2ContractArtifactKind.UNSIGNED_PDF),
        signedPdf: this.findLatestArtifact(contract.artifacts, V2ContractArtifactKind.SIGNED_PDF),
      },
    };
  }

  private findLatestArtifact(
    artifacts: Array<{ id: string; kind: string; fileName: string; createdAt: Date }>,
    kind: string,
  ): SummaryArtifact {
    const artifact = artifacts.find((candidate) => candidate.kind === kind);

    if (!artifact) {
      return null;
    }

    return {
      id: artifact.id,
      fileName: artifact.fileName,
      createdAt: artifact.createdAt.toISOString(),
    };
  }
}
