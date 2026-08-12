import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { RentalStatus } from 'src/modules/rental-commitment/domain/rental-status';
import { RentalCommitmentPublicApi } from 'src/modules/rental-commitment/public-api/rental-commitment.public-api';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import { RentalRemitoRendererPort } from '../../domain/ports/rental-remito-renderer.port';
import { formatAcceptedPricingForRentalRemito, formatLocalDate } from '../rental-remito/rental-remito-formatters';
import { RentalRemitoPdfData } from '../rental-remito/rental-remito-pdf-data';

export interface RentalBudgetCustomerOverride {
  fullName?: string;
  documentNumber?: string;
  address?: string;
  phone?: string;
}

export interface RenderRentalBudgetInput {
  tenantId: string;
  rentalId: string;
  customer?: RentalBudgetCustomerOverride;
}

export interface RenderRentalBudgetResult {
  buffer: Buffer;
  fileName: string;
}

export type RentalBudgetDocumentErrorCode = 'RentalNotFound' | 'RentalNotDraft' | 'CustomerNameMissing' | 'ContextMissing' | 'PriceSnapshotInvalid';

export interface RentalBudgetDocumentError {
  code: RentalBudgetDocumentErrorCode;
  message: string;
  cause?: unknown;
}

export type RenderRentalBudgetUseCaseResult = Result<RenderRentalBudgetResult, RentalBudgetDocumentError>;

@Injectable()
export class RentalBudgetDocumentService {
  constructor(
    private readonly rentalCommitmentApi: RentalCommitmentPublicApi,
    private readonly tenantManagementApi: TenantManagementPublicApi,
    private readonly renderer: RentalRemitoRendererPort,
  ) {}

  async render(input: RenderRentalBudgetInput): Promise<RenderRentalBudgetUseCaseResult> {
    const facts = await this.rentalCommitmentApi.getRentalBudgetDocumentFacts({
      tenantId: input.tenantId,
      rentalId: input.rentalId,
    });
    if (facts.isErr()) return err(this.mapRentalError(facts.error));

    if (facts.value.status !== RentalStatus.Draft) {
      return err({ code: 'RentalNotDraft', message: `Rental "${input.rentalId}" must be DRAFT to generate a budget.` });
    }

    const context = await this.tenantManagementApi.getRentalBudgetDocumentContext({
      tenantId: input.tenantId,
      branchId: facts.value.branchId,
      customerId: facts.value.customerId,
    });
    if (context.isErr()) {
      return err({ code: 'ContextMissing', message: context.error.message, cause: context.error });
    }

    const customer = resolveCustomer(input.customer, context.value.customer);
    if (!customer.fullName) {
      return err({
        code: 'CustomerNameMissing',
        message: `Rental "${input.rentalId}" needs a customer full name to generate a budget.`,
      });
    }

    const documentNumber = `${context.value.tenant.slug}-${facts.value.rentalId.slice(0, 8)}`.toUpperCase();
    const data: RentalRemitoPdfData = {
      document: {
        label: 'PRESUPUESTO',
        number: documentNumber,
        equipmentTitle: 'LISTA DE EQUIPOS PRESUPUESTADOS',
        pickupDate: formatLocalDate(facts.value.periodStart, context.value.branch.timezone),
        returnDate: formatLocalDate(facts.value.periodEnd, context.value.branch.timezone),
        jornadas: facts.value.pricing.chargedUnits,
        agreedPrice: formatAcceptedPricingForRentalRemito(facts.value.pricing),
        logoUrl: context.value.tenant.logoUrl,
        rentalSignatureUrl: context.value.contractSigner?.signatureUrl ?? null,
        presentation: { includeLegalAnnex: false, showRentalSignatureBlock: false },
        landlord: context.value.contractSigner
          ? {
              fullName: context.value.contractSigner.fullName,
              documentNumber: context.value.contractSigner.documentNumber,
              address: context.value.contractSigner.address ?? '',
              phone: context.value.contractSigner.phone ?? '',
            }
          : emptyParty(),
        tenant: customer,
      },
      equipmentLines: facts.value.demandLines.map((line) => ({
        name: line.name,
        quantity: line.quantity,
        includedItems: [],
        serialNumbers: [],
      })),
    };

    const buffer = await this.renderer.render(data);
    return ok({
      buffer,
      fileName: `presupuesto-${normalizeFileNameSegment(customer.fullName)}-${facts.value.rentalId.slice(0, 8)}.pdf`,
    });
  }

  private mapRentalError(error: { code: string; message: string; cause?: unknown }): RentalBudgetDocumentError {
    if (error.code === 'RentalNotFound') return { code: 'RentalNotFound', message: error.message, cause: error };
    if (error.code === 'AcceptedPricingSnapshotInvalid' || error.code === 'AcceptedPricingUnitsIncomplete') {
      return { code: 'PriceSnapshotInvalid', message: error.message, cause: error };
    }
    throw new Error(error.message, { cause: error.cause });
  }
}

function resolveCustomer(
  override: RentalBudgetCustomerOverride | undefined,
  linked: { fullName: string; documentNumber: string | null; address: string | null; phone: string | null } | null,
): RentalRemitoPdfData['document']['tenant'] {
  return {
    fullName: override?.fullName ?? linked?.fullName ?? '',
    documentNumber: override?.documentNumber ?? linked?.documentNumber ?? '',
    address: override?.address ?? linked?.address ?? '',
    phone: override?.phone ?? linked?.phone ?? '',
  };
}

function emptyParty(): RentalRemitoPdfData['document']['landlord'] {
  return { fullName: '', documentNumber: '', address: '', phone: '' };
}

function normalizeFileNameSegment(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}
