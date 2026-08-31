import { parsePostgresRange } from 'src/core/utils/postgres-range.util';
import { Prisma } from 'src/generated/prisma/client';

import { AssetBlock, AssetBlockId } from '../domain/asset-block.entity';
import { AssignedAsset, AssignedAssetId } from '../domain/assigned-asset.entity';
import { RentalDemandLine } from '../domain/rental-demand-line.entity';
import { RentalSelection } from '../domain/rental-selection.entity';
import {
  AssetBlockType,
  FulfillmentMethod,
  RentalSource,
  RentalStatus,
  RentableItemKind,
} from '../domain/rental-status';
import { RentalInvalidFieldError } from '../domain/errors/rental-commitment.errors';
import { AcceptedRentalAssetBuffer, Rental, RentalDeliveryDetails } from '../domain/rental.aggregate';
import { RentalDemandLineId } from '../domain/ids/rental-demand-line-id';
import { RentalSelectionId } from '../domain/ids/rental-selection-id';
import { AssetId, EquipmentTypeId, RentalId } from '../domain/types/rental-commitment-ids';
import {
  AssignedAssetOwnershipSnapshot,
  AssignedAssetOwnershipSnapshotData,
} from '../domain/value-objects/assigned-asset-ownership-snapshot.value-object';
import { BookingSnapshot, JsonValue } from '../domain/value-objects/json-snapshot.value-object';
import { RentalPeriod } from '../domain/value-objects/rental-period.value-object';
import { RentalOwnerSplitDraft } from '../owner-split/owner-split-calculator.types';
import { ConfirmationOperationPersistence } from './rental.repository';

export interface RentalPersistenceRecord {
  id: string;
  tenantId: string;
  rentalNumber: number;
  branchId: string;
  customerId: string | null;
  status: string;
  acceptedBeforeBufferMinutes: number | null;
  acceptedAfterBufferMinutes: number | null;
  fulfillmentMethod: string | null;
  notes: string | null;
  insuranceSelected: boolean;
  bookingSnapshot: Prisma.JsonValue | null;
  periodStart: Date;
  periodEnd: Date;
  priceSnapshot: Prisma.JsonValue | null;
  source: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  confirmedAt: Date | null;
  selections: RentalSelectionPersistenceRecord[];
  demandLines: RentalDemandLinePersistenceRecord[];
  assignedAssets: AssignedAssetPersistenceRecord[];
  assetBlocks: AssetBlockPersistenceRecord[];
  deliveryDetails: RentalDeliveryDetailsPersistenceRecord | null;
}

interface RentalDeliveryDetailsPersistenceRecord {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
}

interface RentalSelectionPersistenceRecord {
  id: string;
  tenantId: string;
  rentalId: string;
  rentalOfferId: string;
  rentableItemId: string;
  rentableItemNameSnapshot: string;
  rentableItemKindSnapshot: string;
  quantity: number;
  priceSnapshot: Prisma.JsonValue | null;
  createdAt: Date;
  removedAt: Date | null;
}

interface RentalDemandLinePersistenceRecord {
  id: string;
  tenantId: string;
  rentalId: string;
  rentalSelectionId: string;
  equipmentTypeId: string;
  equipmentTypeNameSnapshot: string;
  quantity: number;
  createdAt: Date;
  removedAt: Date | null;
}

interface AssignedAssetPersistenceRecord {
  id: string;
  tenantId: string;
  rentalId: string;
  rentalDemandLineId: string;
  assetId: string;
  ownershipSnapshot: Prisma.JsonValue;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  createdAt: Date;
}

export interface AssetBlockPersistenceRecord {
  id: string;
  tenantId: string;
  rentalId: string;
  assetId: string;
  period: string;
  blockType: string;
  createdAt: Date;
  releasedAt: Date | null;
}

export class RentalMapper {
  static toDomain(record: RentalPersistenceRecord): Rental {
    const acceptedAssetBuffer = this.toAcceptedAssetBufferDomain(record);
    const result = Rental.reconstitute({
      id: record.id as RentalId,
      tenantId: record.tenantId,
      rentalNumber: record.rentalNumber,
      branchId: record.branchId,
      rentalCustomerId: record.customerId ?? undefined,
      status: record.status as RentalStatus,
      period: new RentalPeriod(record.periodStart, record.periodEnd),
      source: record.source === null ? undefined : (record.source as RentalSource),
      fulfillmentMethod:
        record.fulfillmentMethod === null ? undefined : (record.fulfillmentMethod as FulfillmentMethod),
      notes: record.notes ?? undefined,
      insuranceSelected: record.insuranceSelected,
      bookingSnapshot:
        record.bookingSnapshot === null ? undefined : new BookingSnapshot(record.bookingSnapshot as JsonValue),
      deliveryDetails: record.deliveryDetails ? this.toDeliveryDetailsDomain(record.deliveryDetails) : undefined,
      priceSnapshot:
        record.status === 'CONFIRMED' ? undefined : ((record.priceSnapshot as JsonValue | null) ?? undefined),
      confirmedPriceSnapshot:
        record.status === 'CONFIRMED' ? ((record.priceSnapshot as JsonValue | null) ?? undefined) : undefined,
      acceptedAssetBuffer,
      selections: record.selections.map((selection) =>
        RentalSelection.reconstitute({
          id: selection.id as RentalSelectionId,
          tenantId: selection.tenantId,
          rentalId: selection.rentalId,
          rentalOfferId: selection.rentalOfferId,
          rentableItemId: selection.rentableItemId,
          rentableItemNameSnapshot: selection.rentableItemNameSnapshot,
          rentableItemKindSnapshot: selection.rentableItemKindSnapshot as RentableItemKind,
          quantity: selection.quantity,
          priceSnapshot: (selection.priceSnapshot as JsonValue | null) ?? undefined,
          createdAt: selection.createdAt,
          removedAt: selection.removedAt ?? undefined,
        }),
      ),
      demandLines: record.demandLines.map((line) =>
        RentalDemandLine.reconstitute({
          id: line.id as RentalDemandLineId,
          tenantId: line.tenantId,
          rentalId: line.rentalId,
          rentalSelectionId: line.rentalSelectionId as RentalSelectionId,
          equipmentTypeId: line.equipmentTypeId as EquipmentTypeId,
          equipmentTypeNameSnapshot: line.equipmentTypeNameSnapshot,
          quantity: line.quantity,
          createdAt: line.createdAt,
          removedAt: line.removedAt ?? undefined,
        }),
      ),
      assignedAssets: record.assignedAssets.map((assignment) =>
        AssignedAsset.reconstitute({
          id: assignment.id as AssignedAssetId,
          tenantId: assignment.tenantId,
          rentalId: assignment.rentalId,
          rentalDemandLineId: assignment.rentalDemandLineId as RentalDemandLineId,
          assetId: assignment.assetId as AssetId,
          ownershipSnapshot: AssignedAssetOwnershipSnapshot.reconstitute(
            assignment.ownershipSnapshot as AssignedAssetOwnershipSnapshotData,
          ),
          effectiveFrom: assignment.effectiveFrom,
          effectiveUntil: assignment.effectiveUntil ?? undefined,
          createdAt: assignment.createdAt,
        }),
      ),
      assetBlocks: record.assetBlocks.map((block) => {
        const period = parsePostgresRange(block.period);
        return AssetBlock.reconstitute({
          id: block.id as AssetBlockId,
          tenantId: block.tenantId,
          rentalId: block.rentalId,
          assetId: block.assetId as AssetId,
          period: new RentalPeriod(period.start, period.end),
          blockType: block.blockType as AssetBlockType,
          createdAt: block.createdAt,
          releasedAt: block.releasedAt ?? undefined,
        });
      }),
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      cancelledAt: record.cancelledAt ?? undefined,
      confirmedAt: record.confirmedAt ?? undefined,
    });

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }

  static toRentalCreateData(
    rental: Rental,
    confirmationOperation?: ConfirmationOperationPersistence,
  ): Prisma.V2RentalUncheckedCreateInput {
    return {
      id: rental.id,
      tenantId: rental.tenantId,
      rentalNumber: rental.rentalNumber,
      branchId: rental.branchId,
      customerId: rental.rentalCustomerId,
      status: rental.status,
      fulfillmentMethod: rental.fulfillmentMethod,
      notes: rental.notes,
      insuranceSelected: rental.insuranceSelected ?? false,
      bookingSnapshot: toPrismaJsonInput(rental.bookingSnapshot?.toJSON()),
      periodStart: rental.period.start,
      periodEnd: rental.period.end,
      priceSnapshot: toPrismaJsonInput(rental.priceSnapshot?.toJSON()),
      source: rental.source,
      cancelledAt: rental.cancelledAt,
      confirmedAt: rental.confirmedAt,
      confirmationOperationId: confirmationOperation?.operationId,
      confirmationFingerprint: confirmationOperation?.fingerprint,
      acceptedBeforeBufferMinutes: rental.acceptedAssetBuffer?.beforeBufferMinutes,
      acceptedAfterBufferMinutes: rental.acceptedAssetBuffer?.afterBufferMinutes,
    };
  }

  static toRentalUpdateData(rental: Rental): Prisma.V2RentalUncheckedUpdateInput {
    return {
      branchId: rental.branchId,
      customerId: rental.rentalCustomerId,
      status: rental.status,
      fulfillmentMethod: rental.fulfillmentMethod,
      notes: rental.notes,
      insuranceSelected: rental.insuranceSelected ?? false,
      bookingSnapshot: toPrismaJsonInput(rental.bookingSnapshot?.toJSON()),
      periodStart: rental.period.start,
      periodEnd: rental.period.end,
      priceSnapshot: toPrismaJsonInput(rental.priceSnapshot?.toJSON()),
      source: rental.source,
      cancelledAt: rental.cancelledAt,
      confirmedAt: rental.confirmedAt,
      acceptedBeforeBufferMinutes: rental.acceptedAssetBuffer?.beforeBufferMinutes,
      acceptedAfterBufferMinutes: rental.acceptedAssetBuffer?.afterBufferMinutes,
    };
  }

  private static toAcceptedAssetBufferDomain(record: RentalPersistenceRecord): AcceptedRentalAssetBuffer | undefined {
    const before = record.acceptedBeforeBufferMinutes;
    const after = record.acceptedAfterBufferMinutes;

    if (before === null && after === null) {
      return undefined;
    }

    if (before === null || after === null) {
      throw new RentalInvalidFieldError('acceptedAssetBuffer', 'persisted buffer values must both be present');
    }

    return { beforeBufferMinutes: before, afterBufferMinutes: after };
  }

  static toSelectionCreateData(selection: RentalSelection): Prisma.V2RentalSelectionCreateManyInput {
    return {
      id: selection.id,
      tenantId: selection.tenantId,
      rentalId: selection.rentalId,
      rentalOfferId: selection.rentalOfferId,
      rentableItemId: selection.rentableItemId,
      rentableItemNameSnapshot: selection.rentableItemNameSnapshot,
      rentableItemKindSnapshot: selection.rentableItemKindSnapshot,
      quantity: selection.quantity,
      priceSnapshot: toPrismaJsonInput(selection.priceSnapshot?.toJSON()),
      createdAt: selection.createdAt,
      removedAt: selection.removedAt,
    };
  }

  static toDemandLineCreateData(line: RentalDemandLine): Prisma.V2RentalDemandLineCreateManyInput {
    return {
      id: line.id,
      tenantId: line.tenantId,
      rentalId: line.rentalId,
      rentalSelectionId: line.rentalSelectionId,
      equipmentTypeId: line.equipmentTypeId,
      equipmentTypeNameSnapshot: line.equipmentTypeNameSnapshot,
      quantity: line.quantity,
      createdAt: line.createdAt,
      removedAt: line.removedAt,
    };
  }

  static toDeliveryDetailsDomain(record: RentalDeliveryDetailsPersistenceRecord): RentalDeliveryDetails {
    return {
      addressLine1: record.addressLine1,
      addressLine2: record.addressLine2 ?? undefined,
      city: record.city,
      state: record.state ?? undefined,
      postalCode: record.postalCode ?? undefined,
      country: record.country ?? undefined,
      contactName: record.contactName ?? undefined,
      contactPhone: record.contactPhone ?? undefined,
      notes: record.notes ?? undefined,
    };
  }

  static toDeliveryDetailsCreateData(rental: Rental): Prisma.V2RentalDeliveryDetailsUncheckedCreateInput | undefined {
    const details = rental.deliveryDetails;
    if (!details) {
      return undefined;
    }

    return {
      tenantId: rental.tenantId,
      rentalOrderId: rental.id,
      addressLine1: details.addressLine1,
      addressLine2: details.addressLine2,
      city: details.city,
      state: details.state,
      postalCode: details.postalCode,
      country: details.country,
      contactName: details.contactName,
      contactPhone: details.contactPhone,
      notes: details.notes,
    };
  }

  static toAssignedAssetCreateData(assignment: AssignedAsset): Prisma.V2AssignedAssetCreateManyInput {
    return {
      id: assignment.id,
      tenantId: assignment.tenantId,
      rentalId: assignment.rentalId,
      rentalDemandLineId: assignment.rentalDemandLineId,
      assetId: assignment.assetId,
      ownershipSnapshot: assignment.ownershipSnapshot.toJSON(),
      effectiveFrom: assignment.effectiveFrom,
      effectiveUntil: assignment.effectiveUntil,
      createdAt: assignment.createdAt,
    };
  }

  static toOwnerSplitCreateData(split: RentalOwnerSplitDraft): Prisma.V2RentalOwnerSplitCreateManyInput {
    return {
      tenantId: split.tenantId,
      rentalId: split.rentalId,
      rentalSelectionId: split.rentalSelectionId,
      rentalDemandLineId: split.rentalDemandLineId,
      assignedAssetId: split.assignedAssetId,
      assetId: split.assetId,
      ownerId: split.ownerId,
      contractId: split.contractId,
      basis: split.basis,
      ownerShare: split.ownerShare,
      basisAmount: split.basisAmount,
      ownerAmount: split.ownerAmount,
      currency: split.currency,
    };
  }
}

function toPrismaJsonInput(
  value: JsonValue | undefined,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined {
  return value === null ? Prisma.JsonNull : value;
}
