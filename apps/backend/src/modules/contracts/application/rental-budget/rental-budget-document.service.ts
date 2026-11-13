import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { DraftRentalFinancialFacts } from 'src/modules/rental-commitment/public-api/draft-rental-financial-facts.public-api';
import { CommittedRentalSelectionsAndDemand } from 'src/modules/rental-commitment/public-api/committed-rental-selections-and-demand.public-api';
import { RentalLifecycleFacts } from 'src/modules/rental-commitment/public-api/rental-lifecycle-facts.public-api';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { RetainedRentalCustomerProfileFacts } from 'src/modules/tenant-management/public-api/retained-rental-customer-profile-facts.public-api';
import { TenantBrandingFacts } from 'src/modules/tenant-management/public-api/tenant-branding-facts.public-api';
import { TenantContractSignerFacts } from 'src/modules/tenant-management/public-api/tenant-contract-signer-facts.public-api';
import { TenantIdentityFacts } from 'src/modules/tenant-management/public-api/tenant-identity-facts.public-api';

import { RentalRemitoRendererPort } from '../../domain/ports/rental-remito-renderer.port';
import { formatProposedRentalBudgetAmount, formatLocalDate } from '../rental-remito/rental-remito-formatters';
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

export type RentalBudgetDocumentErrorCode =
  | 'RentalNotFound'
  | 'RentalNotDraft'
  | 'RentalVersionChanged'
  | 'CustomerNameMissing'
  | 'ContextMissing'
  | 'PriceSnapshotInvalid';

export interface RentalBudgetDocumentError {
  code: RentalBudgetDocumentErrorCode;
  message: string;
  cause?: unknown;
}

export type RenderRentalBudgetUseCaseResult = Result<RenderRentalBudgetResult, RentalBudgetDocumentError>;

@Injectable()
export class RentalBudgetDocumentService {
  constructor(
    private readonly rentalLifecycleFacts: RentalLifecycleFacts,
    private readonly draftRentalFinancialFacts: DraftRentalFinancialFacts,
    private readonly committedRentalSelectionsAndDemand: CommittedRentalSelectionsAndDemand,
    private readonly tenantIdentityFacts: TenantIdentityFacts,
    private readonly tenantBrandingFacts: TenantBrandingFacts,
    private readonly branchFacts: BranchFacts,
    private readonly tenantContractSignerFacts: TenantContractSignerFacts,
    private readonly retainedRentalCustomerProfileFacts: RetainedRentalCustomerProfileFacts,
    private readonly renderer: RentalRemitoRendererPort,
  ) {}

  async render(input: RenderRentalBudgetInput): Promise<RenderRentalBudgetUseCaseResult> {
    const financialFacts = await this.draftRentalFinancialFacts.getDraftRentalFinancialFacts({
      tenantId: input.tenantId,
      rentalId: input.rentalId,
    });
    if (financialFacts.isErr()) return err(this.mapRentalError(financialFacts.error));

    const lifecycle = await this.rentalLifecycleFacts.getRentalLifecycleFacts({
      tenantId: input.tenantId,
      rentalId: input.rentalId,
    });
    if (lifecycle.isErr()) return err(this.mapRentalError(lifecycle.error));

    const selectionsAndDemand = await this.committedRentalSelectionsAndDemand.getCommittedRentalSelectionsAndDemand({
      tenantId: input.tenantId,
      rentalId: input.rentalId,
    });
    if (selectionsAndDemand.isErr()) return err(this.mapRentalError(selectionsAndDemand.error));

    if (lifecycle.value.status !== 'DRAFT') {
      return err({ code: 'RentalNotDraft', message: `Rental "${input.rentalId}" must be DRAFT to generate a budget.` });
    }

    const [tenantIdentity, tenantBranding, branch, contractSigner, customerProfile] = await Promise.all([
      this.tenantIdentityFacts.getTenantIdentityFacts({ tenantId: input.tenantId }),
      this.tenantBrandingFacts.getTenantBrandingFacts({ tenantId: input.tenantId }),
      this.branchFacts.getBranchFacts({ tenantId: input.tenantId, branchId: lifecycle.value.branchId }),
      this.tenantContractSignerFacts.getSelectedTenantContractSignerFacts({ tenantId: input.tenantId }),
      lifecycle.value.rentalCustomerId
        ? this.retainedRentalCustomerProfileFacts.getRetainedRentalCustomerProfileFacts({
            tenantId: input.tenantId,
            rentalCustomerId: lifecycle.value.rentalCustomerId,
          })
        : Promise.resolve(null),
    ]);

    if (tenantIdentity.isErr()) {
      return err({ code: 'ContextMissing', message: tenantIdentity.error.message, cause: tenantIdentity.error });
    }
    if (tenantBranding.isErr()) {
      return err({ code: 'ContextMissing', message: tenantBranding.error.message, cause: tenantBranding.error });
    }
    if (branch.isErr()) {
      return err({ code: 'ContextMissing', message: branch.error.message, cause: branch.error });
    }

    const customer = resolveCustomer(input.customer, customerProfile);
    if (!customer.fullName) {
      return err({
        code: 'CustomerNameMissing',
        message: `Rental "${input.rentalId}" needs a customer full name to generate a budget.`,
      });
    }

    const financial = financialFacts.value;
    const formatAmount = (amount: string) => formatProposedRentalBudgetAmount(amount, financial.currency);
    const documentNumber = `${tenantIdentity.value.slug}-${lifecycle.value.rentalNumber}`.toUpperCase();
    const data: RentalRemitoPdfData = {
      document: {
        label: 'PRESUPUESTO',
        number: documentNumber,
        equipmentTitle: 'LISTA DE EQUIPOS PRESUPUESTADOS',
        pickupDate: formatLocalDate(lifecycle.value.periodStart, branch.value.effectiveTimezone),
        returnDate: formatLocalDate(lifecycle.value.periodEnd, branch.value.effectiveTimezone),
        jornadas: financial.chargedUnits,
        agreedPrice: formatAmount(financial.customerTotal),
        budgetPricing: {
          equipmentAndInsurance: formatAmount(financial.equipmentAndInsuranceAmount),
          deliveryAndCollection: financial.deliveryCharge === null ? null : formatAmount(financial.deliveryCharge),
          deliveryArrangement: financial.deliveryArrangement,
          total: formatAmount(financial.customerTotal),
        },
        insuranceSelected: false,
        logoUrl: tenantBranding.value.logoUrl,
        rentalSignatureUrl: contractSigner?.signatureUrl ?? null,
        presentation: { includeLegalAnnex: false, showRentalSignatureBlock: false },
        landlord: contractSigner
          ? {
              fullName: contractSigner.fullName,
              documentNumber: contractSigner.documentNumber,
              address: contractSigner.address ?? '',
              phone: contractSigner.phone ?? '',
            }
          : emptyParty(),
        tenant: customer,
      },
      equipmentLines: selectionsAndDemand.value.demandLines.map((line) => ({
        name: line.equipmentTypeNameSnapshot,
        quantity: line.quantity,
        serialNumbers: [],
      })),
    };

    const buffer = await this.renderer.render(data);
    // Bracket every rental fact read, including rendering, with the monotonic draft version.
    // Never return a PDF assembled while another operation changed the persisted proposal.
    const current = await this.draftRentalFinancialFacts.getDraftRentalFinancialFacts({
      tenantId: input.tenantId,
      rentalId: input.rentalId,
    });
    if (current.isErr()) return err(this.mapRentalError(current.error));
    if (current.value.rentalVersion !== financial.rentalVersion) {
      return err({
        code: 'RentalVersionChanged',
        message: 'Rental changed during budget generation. Retry with the current draft.',
      });
    }
    return ok({
      buffer,
      fileName: `presupuesto-${normalizeFileNameSegment(customer.fullName)}-${lifecycle.value.rentalNumber}.pdf`,
    });
  }

  private mapRentalError(error: { code: string; message: string }): RentalBudgetDocumentError {
    if (error.code === 'RentalNotFound') return { code: 'RentalNotFound', message: error.message, cause: error };
    if (error.code === 'RentalNotDraft') return { code: 'RentalNotDraft', message: error.message, cause: error };
    if (error.code === 'DraftFinancialFactsInvalid') {
      return { code: 'PriceSnapshotInvalid', message: error.message, cause: error };
    }
    throw new Error(error.message, { cause: error });
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
