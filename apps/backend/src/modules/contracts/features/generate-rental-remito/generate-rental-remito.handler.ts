import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { RentalRemitoApplicationError } from '../../application/rental-remito/rental-remito-application.error';
import {
  RenderRentalRemitoResult,
  RentalRemitoDocumentService,
} from '../../application/rental-remito/rental-remito-document.service';
import {
  generateRentalRemitoError,
  GenerateRentalRemitoError,
  GenerateRentalRemitoErrorCode,
} from './generate-rental-remito.errors';
import { GenerateRentalRemitoQuery } from './generate-rental-remito.query';

export type GenerateRentalRemitoResult = Result<RenderRentalRemitoResult, GenerateRentalRemitoError>;
export type GenerateRentalRemitoReadModel = RenderRentalRemitoResult;

@QueryHandler(GenerateRentalRemitoQuery)
export class GenerateRentalRemitoHandler implements IQueryHandler<
  GenerateRentalRemitoQuery,
  GenerateRentalRemitoResult
> {
  constructor(private readonly documentService: RentalRemitoDocumentService) {}

  async execute(query: GenerateRentalRemitoQuery): Promise<GenerateRentalRemitoResult> {
    const result = await this.documentService.render({
      tenantId: query.tenantId,
      rentalId: query.rentalId,
      purpose: 'preview',
    });

    if (result.isOk()) {
      return ok(result.value);
    }

    const code = generateRentalRemitoErrorCodeMap[result.error.code];

    if (!code) {
      throwUnexpectedRentalRemitoError(result.error);
    }

    return err(
      generateRentalRemitoError(code, result.error.message, result.error, {
        useCase: 'GenerateRentalRemito',
        tenantId: query.tenantId,
        rentalId: query.rentalId,
      }),
    );
  }
}

const generateRentalRemitoErrorCodeMap: Partial<
  Record<RentalRemitoApplicationError['code'], GenerateRentalRemitoErrorCode>
> = {
  RentalNotFound: 'contracts.rental_remito_rental_not_found',
  RentalNotReady: 'contracts.rental_remito_rental_not_ready',
  CustomerProfileMissing: 'contracts.rental_remito_customer_profile_missing',
  BranchContextMissing: 'contracts.rental_remito_branch_context_missing',
  PriceSnapshotInvalid: 'contracts.rental_remito_price_snapshot_invalid',
};

function throwUnexpectedRentalRemitoError(error: RentalRemitoApplicationError): never {
  if (error.cause instanceof Error) {
    throw error.cause;
  }

  throw new Error(error.message, { cause: error.cause });
}
