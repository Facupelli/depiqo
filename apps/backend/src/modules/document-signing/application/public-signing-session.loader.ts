import { Injectable } from '@nestjs/common';
import { Result, err, ok } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2ContractArtifactKind, V2DocumentSigningRequestStatus } from 'src/generated/prisma/enums';

import { SigningTokenService } from './signing-token.service';
import {
  PublicSigningRequestExpiredError,
  PublicSigningRequestNotFoundError,
  PublicSigningRequestUnavailableError,
  PublicSigningTokenRequiredError,
  PublicSigningUnsignedArtifactHashMissingError,
  PublicSigningUnsignedArtifactMissingError,
} from '../domain/errors/document-signing.errors';

export type PublicSigningSessionLoaderError =
  | PublicSigningTokenRequiredError
  | PublicSigningRequestNotFoundError
  | PublicSigningRequestExpiredError
  | PublicSigningRequestUnavailableError
  | PublicSigningUnsignedArtifactMissingError
  | PublicSigningUnsignedArtifactHashMissingError;

export interface PublicSigningSession {
  id: string;
  tenantId: string;
  contractId: string;
  rentalId: string;
  signerName: string;
  signerEmail: string | null;
  signerPhone: string | null;
  status: V2DocumentSigningRequestStatus;
  expiresAt: Date | null;
  signedAt: Date | null;
  providerData: unknown;
  unsignedArtifact: {
    id: string;
    storageKey: string;
    fileName: string;
    contentType: string;
    byteSize: number;
    documentHash: string;
    hashAlgorithm: 'SHA-256';
  };
  contract: {
    id: string;
    documentNumber: string | null;
    status: string;
  };
}

export interface LoadPublicSigningSessionOptions {
  rawToken: string | null | undefined;
  allowedStatuses: V2DocumentSigningRequestStatus[];
  markViewed?: boolean;
}

@Injectable()
export class PublicSigningSessionLoader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signingTokenService: SigningTokenService,
  ) {}

  async load(
    options: LoadPublicSigningSessionOptions,
  ): Promise<Result<PublicSigningSession, PublicSigningSessionLoaderError>> {
    const rawToken = normalizeToken(options.rawToken);

    if (!rawToken) {
      return err(new PublicSigningTokenRequiredError());
    }

    const tokenHash = this.signingTokenService.hashToken(rawToken);
    const now = new Date();

    const request = await this.prisma.client.v2DocumentSigningRequest.findUnique({
      where: {
        tokenHash,
      },
      include: {
        contract: {
          select: {
            id: true,
            documentNumber: true,
            status: true,
          },
        },
        unsignedArtifact: {
          select: {
            id: true,
            kind: true,
            storageKey: true,
            fileName: true,
            contentType: true,
            byteSize: true,
            documentHash: true,
            hashAlgorithm: true,
          },
        },
      },
    });

    if (!request) {
      return err(new PublicSigningRequestNotFoundError());
    }

    if (request.expiresAt && request.expiresAt.getTime() <= now.getTime()) {
      await this.prisma.client.v2DocumentSigningRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: V2DocumentSigningRequestStatus.EXPIRED,
          tokenHash: null,
        },
      });

      return err(new PublicSigningRequestExpiredError());
    }

    if (!options.allowedStatuses.includes(request.status)) {
      return err(new PublicSigningRequestUnavailableError());
    }

    if (request.unsignedArtifact.kind !== V2ContractArtifactKind.UNSIGNED_PDF) {
      return err(new PublicSigningUnsignedArtifactMissingError());
    }

    if (!request.unsignedArtifact.documentHash || request.unsignedArtifact.hashAlgorithm !== 'SHA-256') {
      return err(new PublicSigningUnsignedArtifactHashMissingError());
    }

    const shouldMarkViewed = options.markViewed === true && request.status === V2DocumentSigningRequestStatus.SENT;

    if (shouldMarkViewed) {
      await this.prisma.client.v2DocumentSigningRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: V2DocumentSigningRequestStatus.VIEWED,
          viewedAt: now,
        },
      });

      request.status = V2DocumentSigningRequestStatus.VIEWED;
      request.viewedAt = now;
    }

    return ok({
      id: request.id,
      tenantId: request.tenantId,
      contractId: request.contractId,
      rentalId: request.rentalId,
      signerName: request.signerName,
      signerEmail: request.signerEmail,
      signerPhone: request.signerPhone,
      status: request.status,
      expiresAt: request.expiresAt,
      signedAt: request.signedAt,
      providerData: request.providerData,
      unsignedArtifact: {
        id: request.unsignedArtifact.id,
        storageKey: request.unsignedArtifact.storageKey,
        fileName: request.unsignedArtifact.fileName,
        contentType: request.unsignedArtifact.contentType,
        byteSize: request.unsignedArtifact.byteSize,
        documentHash: request.unsignedArtifact.documentHash,
        hashAlgorithm: request.unsignedArtifact.hashAlgorithm,
      },
      contract: {
        id: request.contract.id,
        documentNumber: request.contract.documentNumber,
        status: request.contract.status,
      },
    });
  }
}

function normalizeToken(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : null;
}
