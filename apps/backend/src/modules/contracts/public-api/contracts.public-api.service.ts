import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Result, ok } from 'neverthrow';

import { RentalRemitoApplicationError } from '../application/rental-remito/rental-remito-application.error';
import { RentalRemitoContractStateService } from '../application/rental-remito/rental-remito-contract-state.service';
import { RentalRemitoDocumentService } from '../application/rental-remito/rental-remito-document.service';
import { PrepareRentalRemitoForSigningResult } from '../features/prepare-rental-remito-for-signing/prepare-rental-remito-for-signing.handler';
import { PrepareRentalRemitoForSigningQuery } from '../features/prepare-rental-remito-for-signing/prepare-rental-remito-for-signing.query';
import { RentalRemitoForSigningReadModel } from '../features/prepare-rental-remito-for-signing/prepare-rental-remito-for-signing.read-model';
import {
  MarkRentalRemitoSignedInput,
  MarkRentalRemitoSigningRequestedInput,
  PrepareRentalRemitoForSigningInput,
  RenderSignedRentalRemitoInput,
  RenderSignedRentalRemitoResult,
  V2ContractsPublicApi,
} from './contracts.public-api';

@Injectable()
export class V2V2ContractsPublicApiService implements V2ContractsPublicApi {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly contractStateService: RentalRemitoContractStateService,
    private readonly rentalRemitoDocumentService: RentalRemitoDocumentService,
  ) {}

  prepareRentalRemitoForSigning(
    input: PrepareRentalRemitoForSigningInput,
  ): Promise<Result<RentalRemitoForSigningReadModel, RentalRemitoApplicationError>> {
    return this.queryBus.execute<PrepareRentalRemitoForSigningQuery, PrepareRentalRemitoForSigningResult>(
      new PrepareRentalRemitoForSigningQuery(input.tenantId, input.rentalId),
    );
  }

  markRentalRemitoSigningRequested(
    input: MarkRentalRemitoSigningRequestedInput,
  ): Promise<Result<void, RentalRemitoApplicationError>> {
    return this.contractStateService.markSigningRequested(input);
  }

  async renderSignedRentalRemito(
    input: RenderSignedRentalRemitoInput,
  ): Promise<Result<RenderSignedRentalRemitoResult, RentalRemitoApplicationError>> {
    const renderResult = await this.rentalRemitoDocumentService.render({
      tenantId: input.tenantId,
      rentalId: input.rentalId,
      purpose: 'signing',
      signedSummary: {
        signatureImageDataUrl: input.signatureImageDataUrl,
        signerEmail: input.signerEmail,
        signedAt: input.signedAt.toISOString(),
        sessionReference: input.signingRequestId,
      },
    });

    if (renderResult.isErr()) {
      return renderResult;
    }

    return ok({
      buffer: renderResult.value.buffer,
      fileName: renderResult.value.fileName,
      documentNumber: renderResult.value.documentNumber,
    });
  }

  markRentalRemitoSigned(input: MarkRentalRemitoSignedInput): Promise<Result<void, RentalRemitoApplicationError>> {
    return this.contractStateService.markSigned(input);
  }
}
