import { Readable } from 'node:stream';

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Result, err, ok } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2ContractArtifactStorageStatus } from 'src/generated/prisma/enums';
import { ObjectStoragePort } from 'src/modules/object-storage/application/ports/object-storage.port';

import {
  DownloadRentalSignedRemitoError,
  downloadRentalSignedRemitoError,
} from './download-rental-signed-remito.errors';
import { DownloadRentalSignedRemitoQuery } from './download-rental-signed-remito.query';

export interface DownloadRentalSignedRemitoReadModel {
  fileName: string;
  contentType: string;
  byteSize: number;
  stream: Readable;
}

export type DownloadRentalSignedRemitoResult = Result<
  DownloadRentalSignedRemitoReadModel,
  DownloadRentalSignedRemitoError
>;

@QueryHandler(DownloadRentalSignedRemitoQuery)
export class DownloadRentalSignedRemitoHandler implements IQueryHandler<
  DownloadRentalSignedRemitoQuery,
  DownloadRentalSignedRemitoResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStoragePort,
  ) {}

  async execute(query: DownloadRentalSignedRemitoQuery): Promise<DownloadRentalSignedRemitoResult> {
    const contract = await this.prisma.client.v2Contract.findFirst({
      where: {
        tenantId: query.tenantId,
        rentalId: query.rentalId,
      },
      select: {
        acceptances: {
          orderBy: { acceptedAt: 'desc' },
          take: 1,
          select: {
            signedArtifact: {
              select: {
                storageKey: true,
                fileName: true,
                contentType: true,
                byteSize: true,
                storageStatus: true,
              },
            },
          },
        },
      },
    });

    const context = {
      useCase: 'DownloadRentalSignedRemito',
      tenantId: query.tenantId,
      rentalId: query.rentalId,
    };

    if (!contract || contract.acceptances.length === 0) {
      return err(
        downloadRentalSignedRemitoError(
          'contracts.signed_remito_not_found',
          `No signed Remito was found for rental "${query.rentalId}".`,
          context,
        ),
      );
    }

    const artifact = contract.acceptances[0].signedArtifact;

    if (!artifact || artifact.storageStatus !== V2ContractArtifactStorageStatus.AVAILABLE) {
      return err(
        downloadRentalSignedRemitoError(
          'contracts.signed_remito_unavailable',
          `The latest signed Remito for rental "${query.rentalId}" is not available.`,
          context,
        ),
      );
    }

    return ok({
      fileName: artifact.fileName,
      contentType: artifact.contentType,
      byteSize: artifact.byteSize,
      stream: await this.objectStorage.getObjectStream({ key: artifact.storageKey }),
    });
  }
}
