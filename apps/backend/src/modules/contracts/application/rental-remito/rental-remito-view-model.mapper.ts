import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { rentalRemitoApplicationError, RentalRemitoApplicationError } from './rental-remito-application.error';
import {
  formatCurrencyFromSnapshot,
  formatLocalDate,
  resolveBillingUnitsFromSnapshot,
} from './rental-remito-formatters';
import { RentalRemitoPdfData, RentalRemitoEquipmentLine, SignedContractSummary } from './rental-remito-pdf-data';
import { RentalRemitoSourceReadModel } from './rental-remito-source-read-model';

export interface MapRentalRemitoViewModelOptions {
  signedSummary?: SignedContractSummary;
  requireValidPriceSnapshot: boolean;
}

@Injectable()
export class RentalRemitoViewModelMapper {
  map(
    source: RentalRemitoSourceReadModel,
    options: MapRentalRemitoViewModelOptions,
  ): Result<RentalRemitoPdfData, RentalRemitoApplicationError> {
    const agreedPrice = formatCurrencyFromSnapshot(source.rental.priceSnapshot);
    const jornadas = resolveBillingUnitsFromSnapshot(source.rental.priceSnapshot);

    if (options.requireValidPriceSnapshot && (!agreedPrice || jornadas === null)) {
      return err(
        rentalRemitoApplicationError(
          'PriceSnapshotInvalid',
          `Rental "${source.rental.id}" has an invalid or missing confirmed price snapshot.`,
        ),
      );
    }

    const timezone = source.branch.timezone ?? 'UTC';
    const documentNumber = buildDocumentNumber(source);

    return ok({
      document: {
        label: 'REMITO',
        number: documentNumber,
        equipmentTitle: 'LISTA DE EQUIPOS RETIRADOS',
        pickupDate: formatLocalDate(source.rental.periodStart, timezone),
        returnDate: formatLocalDate(source.rental.periodEnd, timezone),
        jornadas: jornadas ?? 0,
        agreedPrice: agreedPrice ?? '',
        logoUrl: source.tenant.branding?.logoUrl ?? null,
        rentalSignatureUrl: source.contractSigner?.signatureUrl ?? null,
        showRentalSignatureBlock: true,
        landlord: {
          fullName: source.contractSigner?.fullName ?? '',
          documentNumber: source.contractSigner?.documentNumber ?? '',
          address: source.contractSigner?.address ?? '',
          phone: source.contractSigner?.phone ?? '',
        },
        tenant: {
          fullName: source.customer?.displayName ?? '',
          documentNumber: source.customer?.documentNumber ?? '',
          address: source.customer?.address ?? '',
          phone: source.customer?.phone ?? '',
        },
        signedSummary: options.signedSummary,
      },
      equipmentLines: this.mapEquipmentLines(source),
    });
  }

  private mapEquipmentLines(source: RentalRemitoSourceReadModel): RentalRemitoEquipmentLine[] {
    const accessoriesByDemandLineId = new Map<string, RentalRemitoEquipmentLine['includedItems']>();

    for (const accessory of source.accessoryLines) {
      if (!accessory.sourceRentalDemandLineId) {
        continue;
      }

      const existing = accessoriesByDemandLineId.get(accessory.sourceRentalDemandLineId) ?? [];

      existing.push({
        name: accessory.name,
        quantity: accessory.quantity,
      });

      accessoriesByDemandLineId.set(accessory.sourceRentalDemandLineId, existing);
    }

    return source.equipmentLines.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      includedItems: accessoriesByDemandLineId.get(line.id) ?? [],
    }));
  }
}

function buildDocumentNumber(source: RentalRemitoSourceReadModel): string {
  return `${source.tenant.slug}-${source.rental.id.slice(0, 8)}`.toUpperCase();
}
