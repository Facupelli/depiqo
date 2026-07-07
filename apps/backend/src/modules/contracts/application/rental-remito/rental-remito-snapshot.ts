import { RentalRemitoPdfData } from './rental-remito-pdf-data';
import { RentalRemitoSourceReadModel } from './rental-remito-source-read-model';

export type RentalRemitoSnapshot = {
  schema: 'v2.rental-remito-snapshot';
  version: 1;
  generatedAt: string;
  renderer: {
    schema: 'v2.rental-remito-pdf-data';
    version: 1;
  };
  rental: {
    id: string;
    tenantId: string;
    branchId: string;
    customerId: string | null;
    periodStart: string;
    periodEnd: string;
    insuranceSelected: boolean;
  };
  document: {
    number: string;
    label: 'REMITO';
  };
  customer: {
    id: string;
    email: string | null;
    displayName: string;
    phone: string | null;
    documentNumber: string | null;
    address: string | null;
  } | null;
  tenantSigner: {
    fullName: string;
    documentNumber: string;
    phone: string | null;
    address: string | null;
    signatureUrl: string | null;
  } | null;
  pricing: {
    agreedPrice: string;
    jornadas: number;
    sourceSnapshotSchema: 'v2.rental-price-snapshot';
    sourceSnapshotVersion: 1;
    sourcePriceMode: 'final';
  };
  equipmentLines: RentalRemitoPdfData['equipmentLines'];
};

export function toRentalRemitoSnapshot(
  source: RentalRemitoSourceReadModel,
  pdfData: RentalRemitoPdfData,
): RentalRemitoSnapshot {
  return {
    schema: 'v2.rental-remito-snapshot',
    version: 1,
    generatedAt: new Date().toISOString(),
    renderer: {
      schema: 'v2.rental-remito-pdf-data',
      version: 1,
    },
    rental: {
      id: source.rental.id,
      tenantId: source.rental.tenantId,
      branchId: source.rental.branchId,
      customerId: source.rental.customerId,
      periodStart: source.rental.periodStart.toISOString(),
      periodEnd: source.rental.periodEnd.toISOString(),
      insuranceSelected: source.rental.insuranceSelected,
    },
    document: {
      number: pdfData.document.number,
      label: pdfData.document.label,
    },
    customer: source.customer,
    tenantSigner: source.contractSigner,
    pricing: {
      agreedPrice: pdfData.document.agreedPrice,
      jornadas: pdfData.document.jornadas,
      sourceSnapshotSchema: 'v2.rental-price-snapshot',
      sourceSnapshotVersion: 1,
      sourcePriceMode: 'final',
    },
    equipmentLines: pdfData.equipmentLines,
  };
}
