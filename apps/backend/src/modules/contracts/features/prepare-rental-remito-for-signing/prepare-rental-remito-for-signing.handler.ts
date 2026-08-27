import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2ContractArtifactKind, V2ContractArtifactStorageStatus, V2ContractStatus } from 'src/generated/prisma/enums';

import { ContractArtifactPersistenceService } from '../../application/contract-artifact-persistence.service';
import { RentalRemitoApplicationError } from '../../application/rental-remito/rental-remito-application.error';
import { RentalRemitoContractWriterService } from '../../application/rental-remito/rental-remito-contract-writer.service';
import { RentalRemitoDocumentService } from '../../application/rental-remito/rental-remito-document.service';
import { RentalRemitoSnapshot } from '../../application/rental-remito/rental-remito-snapshot';
import { PrepareRentalRemitoForSigningQuery } from './prepare-rental-remito-for-signing.query';
import { RentalRemitoForSigningReadModel } from './prepare-rental-remito-for-signing.read-model';

export type PrepareRentalRemitoForSigningResult = Result<RentalRemitoForSigningReadModel, RentalRemitoApplicationError>;

@QueryHandler(PrepareRentalRemitoForSigningQuery)
export class PrepareRentalRemitoForSigningHandler implements IQueryHandler<
  PrepareRentalRemitoForSigningQuery,
  PrepareRentalRemitoForSigningResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: RentalRemitoDocumentService,
    private readonly contractWriter: RentalRemitoContractWriterService,
    private readonly artifactPersistence: ContractArtifactPersistenceService,
  ) {}

  async execute(query: PrepareRentalRemitoForSigningQuery): Promise<PrepareRentalRemitoForSigningResult> {
    const existing = await this.prisma.client.v2Contract.findUnique({
      where: { tenantId_rentalId: { tenantId: query.tenantId, rentalId: query.rentalId } },
      select: {
        id: true,
        rentalId: true,
        status: true,
        documentNumber: true,
        snapshot: true,
        artifacts: {
          where: {
            kind: V2ContractArtifactKind.UNSIGNED_PDF,
            storageStatus: V2ContractArtifactStorageStatus.AVAILABLE,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, documentHash: true, fileName: true },
        },
      },
    });
    const artifact = existing?.artifacts[0];
    const canReuseArtifact =
      existing?.status !== V2ContractStatus.DRAFT && existing?.status !== V2ContractStatus.RESIGN_REQUIRED;
    if (existing && artifact && canReuseArtifact) {
      const snapshot = existing.snapshot as unknown as RentalRemitoSnapshot;
      return ok({
        contractId: existing.id,
        unsignedArtifactId: artifact.id,
        rentalId: existing.rentalId,
        customerId: snapshot.rental.customerId,
        customerEmail: snapshot.customer?.email ?? null,
        documentHash: artifact.documentHash,
        documentNumber: existing.documentNumber ?? snapshot.document.number,
        fileName: artifact.fileName,
      });
    }

    const rendered = await this.documentService.render({
      tenantId: query.tenantId,
      rentalId: query.rentalId,
      purpose: 'signing',
    });
    if (rendered.isErr()) return err(rendered.error);
    const contract = await this.contractWriter.upsertGeneratedContract({
      tenantId: query.tenantId,
      rentalId: rendered.value.rentalId,
      snapshot: rendered.value.snapshot,
      documentNumber: rendered.value.documentNumber,
    });
    if (contract.isErr()) return err(contract.error);
    const persisted = await this.artifactPersistence.persist({
      tenantId: query.tenantId,
      contractId: contract.value.contractId,
      kind: V2ContractArtifactKind.UNSIGNED_PDF,
      fileName: `${rendered.value.fileName}.pdf`,
      buffer: rendered.value.buffer,
    });
    if (persisted.isErr()) return err({ code: 'RentalNotFound', message: persisted.error.message });
    await this.contractWriter.markGenerated(query.tenantId, contract.value.contractId);
    return ok({
      contractId: contract.value.contractId,
      unsignedArtifactId: persisted.value.id,
      rentalId: rendered.value.rentalId,
      customerId: rendered.value.customerId,
      customerEmail: rendered.value.customerEmail,
      documentHash: persisted.value.documentHash,
      documentNumber: rendered.value.documentNumber,
      fileName: persisted.value.fileName,
    });
  }
}
