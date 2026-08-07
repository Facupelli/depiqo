import { Injectable } from '@nestjs/common';
import { Result, err, ok } from 'neverthrow';

import { V2ContractsPublicApi } from 'src/modules/contracts/public-api/contracts.public-api';

import { PublicSigningDocumentStream } from '../../application/document-signing-public-document-stream.contract';
import { PublicSigningSessionError } from '../../application/public-signing-session.errors';
import {
  PublicV2SigningSessionLoader,
  toPublicSigningSessionError,
} from '../../application/public-v2-signing-session.loader';

@Injectable()
export class StreamPublicUnsignedDocumentService {
  constructor(
    private readonly publicSigningSessionLoader: PublicV2SigningSessionLoader,
    private readonly contracts: V2ContractsPublicApi,
  ) {}

  async stream(rawToken: string): Promise<Result<PublicSigningDocumentStream, PublicSigningSessionError>> {
    const sessionResult = await this.publicSigningSessionLoader.loadRequiredPublicSession(rawToken);
    if (sessionResult.isErr()) return err(sessionResult.error);

    const streamResult = await this.contracts.streamPublicRentalRemitoUnsignedArtifact(rawToken);
    if (streamResult.isErr()) return err(toPublicSigningSessionError(streamResult.error));

    const { unsignedArtifact } = sessionResult.value;
    return ok({
      fileName: unsignedArtifact.fileName,
      contentType: unsignedArtifact.contentType,
      contentLength: unsignedArtifact.byteSize,
      stream: streamResult.value,
    });
  }
}
