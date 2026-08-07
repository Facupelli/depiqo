import { createHash, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  V2ContractArtifactKind,
  V2ContractArtifactStorageStatus,
  V2ContractArtifactVisibility,
} from 'src/generated/prisma/enums';
import { ObjectStoragePort } from 'src/modules/object-storage/application/ports/object-storage.port';

export interface PersistContractArtifactInput {
  tenantId: string;
  contractId: string;
  kind: V2ContractArtifactKind;
  visibility?: V2ContractArtifactVisibility;
  fileName: string;
  buffer: Buffer;
}

export interface PersistedContractArtifact {
  id: string;
  kind: V2ContractArtifactKind;
  storageKey: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  hashAlgorithm: 'SHA-256';
  documentHash: string;
}

export interface ContractArtifactPersistenceError {
  code: 'ContractNotFound';
  message: string;
}

export type PersistContractArtifactResult = Result<PersistedContractArtifact, ContractArtifactPersistenceError>;

@Injectable()
export class ContractArtifactPersistenceService {
  private static readonly contentType = 'application/pdf';
  private static readonly hashAlgorithm = 'SHA-256' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStoragePort,
  ) {}

  async persist(input: PersistContractArtifactInput): Promise<PersistContractArtifactResult> {
    const contract = await this.prisma.client.v2Contract.findFirst({
      where: {
        id: input.contractId,
        tenantId: input.tenantId,
      },
      select: { id: true },
    });

    if (!contract) {
      return err({
        code: 'ContractNotFound',
        message: `Contract "${input.contractId}" was not found for tenant "${input.tenantId}".`,
      });
    }

    const artifactId = randomUUID();
    const documentHash = hashDocument(input.buffer);
    const storageKey = this.buildStorageKey({
      tenantId: input.tenantId,
      contractId: contract.id,
      artifactId,
      kind: input.kind,
    });

    await this.prisma.client.v2ContractArtifact.create({
      data: {
        id: artifactId,
        tenantId: input.tenantId,
        contractId: contract.id,
        kind: input.kind,
        visibility: input.visibility ?? V2ContractArtifactVisibility.INTERNAL,
        storageStatus: V2ContractArtifactStorageStatus.PENDING_UPLOAD,
        storageKey,
        fileName: input.fileName,
        contentType: ContractArtifactPersistenceService.contentType,
        byteSize: input.buffer.byteLength,
        hashAlgorithm: ContractArtifactPersistenceService.hashAlgorithm,
        documentHash,
      },
    });

    try {
      await this.objectStorage.putObject({
        key: storageKey,
        body: input.buffer,
        contentType: ContractArtifactPersistenceService.contentType,
        metadata: {
          tenantId: input.tenantId,
          contractId: contract.id,
          artifactId,
          kind: input.kind,
          hashAlgorithm: ContractArtifactPersistenceService.hashAlgorithm,
          documentHash,
        },
      });
    } catch (error) {
      await this.markUploadFailed(artifactId);
      throw error;
    }

    await this.prisma.client.v2ContractArtifact.update({
      where: { id: artifactId },
      data: { storageStatus: V2ContractArtifactStorageStatus.AVAILABLE },
    });

    return ok({
      id: artifactId,
      kind: input.kind,
      storageKey,
      fileName: input.fileName,
      contentType: ContractArtifactPersistenceService.contentType,
      byteSize: input.buffer.byteLength,
      hashAlgorithm: ContractArtifactPersistenceService.hashAlgorithm,
      documentHash,
    });
  }

  private async markUploadFailed(artifactId: string): Promise<void> {
    try {
      await this.prisma.client.v2ContractArtifact.update({
        where: { id: artifactId },
        data: { storageStatus: V2ContractArtifactStorageStatus.UPLOAD_FAILED },
      });
    } catch {
      // The PENDING_UPLOAD row remains a traceable record for reconciliation.
    }
  }

  private buildStorageKey(input: {
    tenantId: string;
    contractId: string;
    artifactId: string;
    kind: V2ContractArtifactKind;
  }): string {
    return `contracts/${input.tenantId}/${input.contractId}/${input.artifactId}/${input.kind.toLowerCase()}.pdf`;
  }
}

function hashDocument(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
