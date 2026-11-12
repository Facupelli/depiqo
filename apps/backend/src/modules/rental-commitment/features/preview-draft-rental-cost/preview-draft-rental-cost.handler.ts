import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { PreviewDraftRentalCostResponseDto } from '@repo/api-contracts';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { CatalogSelectionResolution } from 'src/modules/catalog/public-api/catalog-selection-resolution.public-api';
import { PricingCalculationError } from 'src/modules/pricing/public-api/pricing-calculation.public-api';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { TenantBillingPreferences } from 'src/modules/tenant-management/public-api/tenant-billing-preferences.public-api';

import {
  DraftRentalDeliveryResolver,
  ExistingDraftDelivery,
} from '../../application/draft-rental-delivery-resolver.service';
import { ProspectiveRentalCostService } from '../../application/prospective-rental-cost.service';
import type { RentalProposalDeliveryDestination } from '../../application/rental-proposal-resolver.service';
import { AcceptedDeliverySnapshot } from '../../domain/value-objects/accepted-delivery-snapshot.value-object';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { PreviewDraftRentalCostError } from './preview-draft-rental-cost.errors';
import { PreviewDraftRentalCostQuery } from './preview-draft-rental-cost.query';

export type PreviewDraftRentalCostResult = Result<PreviewDraftRentalCostResponseDto, PreviewDraftRentalCostError>;

@QueryHandler(PreviewDraftRentalCostQuery)
export class PreviewDraftRentalCostHandler implements IQueryHandler<
  PreviewDraftRentalCostQuery,
  PreviewDraftRentalCostResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogSelectionResolution,
    private readonly billing: TenantBillingPreferences,
    private readonly branches: BranchFacts,
    private readonly cost: ProspectiveRentalCostService,
    private readonly delivery: DraftRentalDeliveryResolver,
  ) {}

  async execute(query: PreviewDraftRentalCostQuery): Promise<PreviewDraftRentalCostResult> {
    const input = query.props;
    let period: RentalPeriod;
    try {
      period = new RentalPeriod(input.period.start, input.period.end);
    } catch (cause) {
      return err({ code: 'rental_commitment.preview_invalid_input', message: 'Invalid rental period.', cause });
    }

    // Rental Commitment owns these facts. No aggregate is instantiated or persisted by this query.
    const draft =
      input.rentalId === undefined
        ? null
        : await this.prisma.client.v2Rental.findFirst({
            where: { tenantId: input.tenantId, id: input.rentalId },
            select: {
              status: true,
              version: true,
              branchId: true,
              periodStart: true,
              periodEnd: true,
              fulfillmentMethod: true,
              deliverySnapshot: true,
              deliveryDetails: {
                select: {
                  address: true,
                  formattedAddress: true,
                  latitude: true,
                  longitude: true,
                  providerPlaceId: true,
                },
              },
            },
          });
    if (input.rentalId !== undefined && !draft) {
      return err({ code: 'rental_commitment.rental_not_found', message: 'Rental not found.' });
    }
    if (draft && draft.status !== 'DRAFT') {
      return err({ code: 'rental_commitment.rental_not_draft', message: 'Only drafts can be previewed for editing.' });
    }

    let existing: ExistingDraftDelivery | undefined;
    if (draft?.fulfillmentMethod === 'DELIVERY' && draft.deliveryDetails && draft.deliverySnapshot) {
      // Validate stored terms with the same value object used by the mutation path.
      const snapshot = AcceptedDeliverySnapshot.create(draft.deliverySnapshot);
      if (snapshot.isErr()) throw snapshot.error;
      existing = {
        branchId: draft.branchId,
        period: new RentalPeriod(draft.periodStart, draft.periodEnd),
        details: {
          address: draft.deliveryDetails.address,
          formattedAddress: draft.deliveryDetails.formattedAddress ?? undefined,
          latitude: draft.deliveryDetails.latitude ?? undefined,
          longitude: draft.deliveryDetails.longitude ?? undefined,
          providerPlaceId: draft.deliveryDetails.providerPlaceId ?? undefined,
        },
        snapshot: snapshot.value.snapshot,
      };
    }

    const [billing, branch] = await Promise.all([
      this.billing.getTenantBillingPreferences({ tenantId: input.tenantId }),
      this.branches.getBranchFacts({ tenantId: input.tenantId, branchId: input.branchId }),
    ]);
    if (billing.isErr())
      return err({
        code: 'rental_commitment.preview_configuration_unavailable',
        message: 'Billing preferences unavailable.',
        cause: billing.error,
      });
    if (branch.isErr()) {
      return err({
        code:
          branch.error.code === 'BranchNotFound'
            ? 'rental_commitment.preview_invalid_input'
            : 'rental_commitment.preview_configuration_unavailable',
        message: 'Branch facts unavailable.',
        cause: branch.error,
      });
    }
    if (!branch.value.isActive || branch.value.isDeleted) {
      return err({ code: 'rental_commitment.preview_invalid_input', message: 'Branch is unavailable.' });
    }
    const selections = await this.catalog.resolveSelectedRentalOffers({
      tenantId: input.tenantId,
      branchId: input.branchId,
      selectedOffers: input.selectedOffers,
    });
    if (selections.isErr())
      return err({
        code: 'rental_commitment.preview_selection_unavailable',
        message: 'Selection cannot be priced.',
        cause: selections.error,
      });

    // Pickup here composes equipment and insurance only. Staff delivery inspection is separate
    // from Storefront's strict serviceability flow, which remains unchanged.
    const pricing = await this.cost.calculate({
      fulfillmentMethod: 'PICKUP',
      pricing: {
        tenantId: input.tenantId,
        customerId: input.rentalCustomerId,
        rentalPeriod: { start: period.start, end: period.end },
        calculationFacts: {
          effectiveTimezone: branch.value.effectiveTimezone,
          dailyBillingPolicy: billing.value.dailyBillingPolicy,
          weekendCountsAsOne: billing.value.weekendCountsAsOne,
        },
        insuranceSelected: input.insuranceSelected,
        targetTotalAdjustment: input.targetTotalAdjustment,
        lines: selections.value.resolvedOffers.map((offer) => ({
          lineReference: offer.rentalOfferId,
          rentalOfferId: offer.rentalOfferId,
          rentableItemId: offer.rentableItem.id,
          rentableItemKind: offer.rentableItem.kind,
          categoryId: offer.rentableItem.categoryId,
          quantity: offer.quantity,
        })),
      },
    });
    if (pricing.isErr()) {
      if (!(pricing.error instanceof PricingCalculationError)) throw pricing.error;
      return err({
        code:
          pricing.error.code === 'pricing_calculation.invalid_request'
            ? 'rental_commitment.preview_invalid_input'
            : 'rental_commitment.preview_pricing_unavailable',
        message: 'Proposed pricing unavailable.',
        cause: pricing.error,
      });
    }
    if (!pricing.value.available) throw new Error('Equipment-only cost must not evaluate delivery.');
    const calculated = pricing.value.pricing;
    const response: PreviewDraftRentalCostResponseDto = {
      pricing: {
        calculatedAtIso: calculated.calculatedAt.toISOString(),
        calculated: calculated.calculated,
        final: calculated.final,
        targetTotalAdjustment: calculated.targetTotalAdjustment,
        insurance: calculated.insurance,
        totalBeforeInsurance: calculated.totalBeforeInsurance,
        total: calculated.total,
      },
      currency: calculated.final.currency,
      customerTotal: calculated.total,
      delivery: null,
      ...(draft ? { draftVersion: draft.version } : {}),
    };
    if (input.fulfillmentMethod === 'PICKUP') return ok(response);

    let destination: RentalProposalDeliveryDestination | undefined;
    if (input.deliveryIntent?.type === 'NEW_DESTINATION') {
      destination = { address: input.deliveryIntent.address, locationId: input.deliveryIntent.locationId };
    } else if (draft?.deliveryDetails) {
      const details = draft.deliveryDetails;
      if (details.formattedAddress === null || details.latitude === null || details.longitude === null) {
        throw new Error('Unresolved delivery destinations require the V2 delivery preview workflow.');
      }
      destination = {
        address: details.address,
        resolvedLocation: {
          formattedAddress: details.formattedAddress,
          latitude: details.latitude,
          longitude: details.longitude,
          providerPlaceId: details.providerPlaceId ?? undefined,
        },
      };
    }
    if (!destination) {
      return ok({
        ...response,
        customerTotal: null,
        delivery: {
          source: 'EVALUATED',
          technicalFailure: null,
          restrictions: [],
          policyExceptionRequired: false,
          requirements: ['DESTINATION_REQUIRED'],
          resolvedDestination: null,
          distanceMeters: null,
          currency: null,
          delivery: null,
          collection: null,
          transportReservationMinutes: null,
          calculatedCharge: null,
          staffAgreedAmount: existing?.snapshot.staffAgreement?.amount ?? null,
          effectiveCharge: null,
        },
      });
    }
    const delivery = await this.delivery.preview({
      tenantId: input.tenantId,
      branchId: input.branchId,
      period,
      destination,
      pricingCurrency: response.currency,
      existing,
      decisions: input.deliveryDecisions,
    });
    return ok({
      ...response,
      delivery,
      customerTotal:
        delivery.technicalFailure !== null || delivery.effectiveCharge === null
          ? null
          : new Decimal(calculated.total).plus(delivery.effectiveCharge).toString(),
    });
  }
}
