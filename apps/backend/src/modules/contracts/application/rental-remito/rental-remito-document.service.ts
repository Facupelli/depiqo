import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { RentalRemitoRendererPort } from '../../domain/ports/rental-remito-renderer.port';
import { rentalRemitoApplicationError, RentalRemitoApplicationError } from './rental-remito-application.error';
import { buildRentalRemitoFileName } from './rental-remito-file-name';
import { RentalRemitoReadModelLoader } from './rental-remito-read-model.loader';
import { RentalRemitoSnapshot, toRentalRemitoSnapshot } from './rental-remito-snapshot';
import { RentalRemitoViewModelMapper } from './rental-remito-view-model.mapper';
import { SignedContractSummary } from './rental-remito-pdf-data';
import { V2RentalStatus } from 'src/generated/prisma/enums';

export interface RenderRentalRemitoInput {
  tenantId: string;
  rentalId: string;
  purpose: 'preview' | 'signing';
  signedSummary?: SignedContractSummary;
}

export interface RenderRentalRemitoResult {
  buffer: Buffer;
  rentalId: string;
  customerId: string | null;
  customerEmail: string | null;
  documentNumber: string;
  fileName: string;
  snapshot: RentalRemitoSnapshot;
}

export type RenderRentalRemitoUseCaseResult = Result<RenderRentalRemitoResult, RentalRemitoApplicationError>;

@Injectable()
export class RentalRemitoDocumentService {
  constructor(
    private readonly readModelLoader: RentalRemitoReadModelLoader,
    private readonly viewModelMapper: RentalRemitoViewModelMapper,
    private readonly renderer: RentalRemitoRendererPort,
  ) {}

  async render(input: RenderRentalRemitoInput): Promise<RenderRentalRemitoUseCaseResult> {
    const sourceResult = await this.readModelLoader.load(input.tenantId, input.rentalId);

    if (sourceResult.isErr()) {
      return err(sourceResult.error);
    }

    const source = sourceResult.value;

    if (source.rental.status !== V2RentalStatus.CONFIRMED) {
      return err(
        rentalRemitoApplicationError(
          'RentalNotReady',
          `Rental "${input.rentalId}" must be CONFIRMED to generate a remito.`,
        ),
      );
    }

    if (!source.customer?.displayName || !source.customer.documentNumber) {
      return err(
        rentalRemitoApplicationError(
          'CustomerProfileMissing',
          `Rental "${input.rentalId}" customer profile is missing legal identity data.`,
        ),
      );
    }

    if (input.purpose === 'signing' && !source.customer.email) {
      return err(
        rentalRemitoApplicationError(
          'CustomerEmailMissing',
          `Rental "${input.rentalId}" customer email is required to prepare remito signing.`,
        ),
      );
    }

    if (input.purpose === 'signing' && !source.contractSigner) {
      return err(
        rentalRemitoApplicationError(
          'TenantSignerMissing',
          `Tenant "${input.tenantId}" does not have an active contract signer configured.`,
        ),
      );
    }

    const pdfDataResult = this.viewModelMapper.map(source, {
      signedSummary: input.signedSummary,
      requireValidPriceSnapshot: true,
    });

    if (pdfDataResult.isErr()) {
      return err(pdfDataResult.error);
    }

    const pdfData = pdfDataResult.value;
    const buffer = await this.renderer.render(pdfData);
    const snapshot = toRentalRemitoSnapshot(source, pdfData);

    const fileName = buildRentalRemitoFileName({
      customerName: source.customer.displayName,
      documentNumber: pdfData.document.number,
      rentalId: source.rental.id,
      signed: Boolean(input.signedSummary),
    });

    return ok({
      buffer,
      rentalId: source.rental.id,
      customerId: source.rental.customerId,
      customerEmail: source.customer.email,
      documentNumber: pdfData.document.number,
      fileName,
      snapshot,
    });
  }
}
