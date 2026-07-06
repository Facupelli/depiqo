import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { RentalRemitoApplicationError } from '../../application/rental-remito/rental-remito-application.error';
import { RentalRemitoContractWriterService } from '../../application/rental-remito/rental-remito-contract-writer.service';
import { RentalRemitoDocumentService } from '../../application/rental-remito/rental-remito-document.service';
import { PrepareRentalRemitoForSigningQuery } from './prepare-rental-remito-for-signing.query';
import { RentalRemitoForSigningReadModel } from './prepare-rental-remito-for-signing.read-model';

export type PrepareRentalRemitoForSigningResult = Result<RentalRemitoForSigningReadModel, RentalRemitoApplicationError>;

@QueryHandler(PrepareRentalRemitoForSigningQuery)
export class PrepareRentalRemitoForSigningHandler implements IQueryHandler<
  PrepareRentalRemitoForSigningQuery,
  PrepareRentalRemitoForSigningResult
> {
  constructor(
    private readonly documentService: RentalRemitoDocumentService,
    private readonly contractWriter: RentalRemitoContractWriterService,
  ) {}

  async execute(query: PrepareRentalRemitoForSigningQuery): Promise<PrepareRentalRemitoForSigningResult> {
    const result = await this.documentService.render({
      tenantId: query.tenantId,
      rentalId: query.rentalId,
      purpose: 'signing',
    });

    if (result.isErr()) {
      return err(result.error);
    }

    const contractResult = await this.contractWriter.upsertGeneratedContract({
      tenantId: query.tenantId,
      rentalId: result.value.rentalId,
      snapshot: result.value.snapshot,
      documentNumber: result.value.documentNumber,
    });

    if (contractResult.isErr()) {
      return err(contractResult.error);
    }

    return ok({
      contractId: contractResult.value.contractId,
      rentalId: result.value.rentalId,
      customerId: result.value.customerId,
      customerEmail: result.value.customerEmail,
      buffer: result.value.buffer,
      documentNumber: result.value.documentNumber,
      fileName: result.value.fileName,
    });
  }
}
