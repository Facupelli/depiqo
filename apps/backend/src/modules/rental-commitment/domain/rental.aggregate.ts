import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { AggregateRootBase } from 'src/core/domain/aggregate-root.base';

import { AssetBlock } from './asset-block.entity';
import { AssignedAsset, CreateAssignedAssetProps } from './assigned-asset.entity';
import {
  AssetBlockPeriodMismatchError,
  AssignedAssetDemandMismatchError,
  ConfirmedRentalRequiresActiveBlocksError,
  ConfirmedRentalRequiresCompleteAssignmentsError,
  ConfirmedRentalRequiresEquipmentDemandError,
  ConfirmedRentalRequiresPriceSnapshotError,
  CurrentAssignedAssetDemandMismatchError,
  DemandLineSelectionMismatchError,
  DuplicateAssignedAssetError,
  RentalAlreadyCancelledError,
  RentalCannotBeCancelledFromStatusError,
  RentalCannotBeConfirmedFromStatusError,
  RentalCannotBeEditedFromStatusError,
  RentalPeriodCannotStartInPastError,
  RentalPeriodHasEndedError,
  RentalSelectionNotFoundError,
  RentalContainsOperationalCommitmentsError,
  RentalAssignedAssetNotFoundError,
  RentalConfirmationRequiresCustomerError,
  RentalChildRentalMismatchError,
  RentalChildTenantMismatchError,
  RentalCommitmentError,
  RentalInvalidFieldError,
  RentalMustBeDraftToAssignCustomerError,
  RentalMustContainSelectionError,
  UnexpectedActiveAssetBlockError,
} from './errors/rental-commitment.errors';
import { RentalDemandLineId } from './ids/rental-demand-line-id';
import { AssetId, RentalId } from './types/rental-commitment-ids';
import { CreateRentalDemandLineProps, RentalDemandLine } from './rental-demand-line.entity';
import { AssetBlockType, FulfillmentMethod, RentalSource, RentalStatus } from './rental-status';
import { CreateRentalSelectionProps, RentalSelection } from './rental-selection.entity';
import { AssignedAssetOwnershipSnapshot } from './value-objects/assigned-asset-ownership-snapshot.value-object';
import { ConfirmedPriceSnapshot } from './value-objects/confirmed-price-snapshot.value-object';
import { BookingSnapshot, JsonSnapshot, JsonValue } from './value-objects/json-snapshot.value-object';
import { RentalPeriod } from './value-objects/rental-period.value-object';
import {
  ConfirmedRentalEditedDomainEvent,
  RentalCancelledDomainEvent,
  RentalConfirmedDomainEvent,
} from './events/rental-lifecycle.domain-events';

export interface RentalDeliveryDetails {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  contactName?: string;
  contactPhone?: string;
  notes?: string;
}

interface RentalProps {
  tenantId: string;
  rentalNumber: number;
  branchId: string;
  rentalCustomerId?: string;
  status: RentalStatus;
  period: RentalPeriod;
  source?: RentalSource;
  fulfillmentMethod?: FulfillmentMethod;
  notes?: string;
  insuranceSelected?: boolean;
  bookingSnapshot?: BookingSnapshot;
  deliveryDetails?: RentalDeliveryDetails;
  priceSnapshot?: JsonSnapshot;
  confirmedPriceSnapshot?: ConfirmedPriceSnapshot;
  selections: RentalSelection[];
  demandLines: RentalDemandLine[];
  assignedAssets: AssignedAsset[];
  assetBlocks: AssetBlock[];
  createdAt?: Date;
  version?: number;
  updatedAt?: Date;
  cancelledAt?: Date;
  confirmedAt?: Date;
}

type CreateRentalSelectionInput = Omit<CreateRentalSelectionProps, 'tenantId' | 'rentalId'>;

type CreateRentalDemandLineInput = Omit<CreateRentalDemandLineProps, 'tenantId' | 'rentalId'>;

type CreateAssignedAssetInput = Omit<
  CreateAssignedAssetProps,
  'tenantId' | 'rentalId' | 'effectiveFrom' | 'effectiveUntil'
>;

export interface EditUnconfirmedRentalProps {
  branchId: string;
  period: RentalPeriod;
  fulfillmentMethod: FulfillmentMethod;
  notes?: string;
  insuranceSelected?: boolean;
  deliveryDetails?: RentalDeliveryDetails;
  priceSnapshot: JsonValue;
  selections: CreateRentalSelectionInput[];
  demandLines: CreateRentalDemandLineInput[];
}

export interface ChangeConfirmedRentalDetailsProps {
  fulfillmentMethod: FulfillmentMethod;
  deliveryDetails?: RentalDeliveryDetails;
  notes?: string;
  insuranceSelected?: boolean;
  confirmedPriceSnapshot?: JsonValue;
  operationTime: Date;
}

export interface AddConfirmedRentalSelectionProps {
  selection: CreateRentalSelectionInput;
  demandLines: CreateRentalDemandLineInput[];
  assignedAssets: CreateAssignedAssetInput[];
  confirmedPriceSnapshot: JsonValue;
  operationTime: Date;
}

export interface RemoveConfirmedSelectionProps {
  selectionId: string;
  confirmedPriceSnapshot: JsonValue;
  operationTime: Date;
}

export interface ChangeConfirmedSelectionQuantityProps {
  selectionId: string;
  newQuantity: number;
  releaseAssetIds: readonly AssetId[];
  newAssignments: readonly CreateAssignedAssetInput[];
  confirmedPriceSnapshot: JsonValue;
  operationTime: Date;
}

export interface ChangeConfirmedPeriodProps {
  newPeriod: { start: Date; end: Date };
  confirmedPriceSnapshot: JsonValue;
  operationTime: Date;
}

export interface CreateRentalBaseProps {
  id?: RentalId;
  tenantId: string;
  rentalNumber: number;
  branchId: string;
  rentalCustomerId?: string;
  period: RentalPeriod;
  source?: RentalSource;
  fulfillmentMethod?: FulfillmentMethod;
  notes?: string;
  insuranceSelected?: boolean;
  bookingSnapshot?: BookingSnapshot;
  deliveryDetails?: RentalDeliveryDetails;
  selections: CreateRentalSelectionInput[];
  demandLines?: CreateRentalDemandLineInput[];
}

export interface CreatePendingRentalProps extends CreateRentalBaseProps {
  priceSnapshot?: JsonValue;
}

export interface CreateDraftRentalProps extends CreateRentalBaseProps {
  priceSnapshot?: JsonValue;
}

export interface CreateConfirmedRentalProps extends Omit<CreateRentalBaseProps, 'demandLines'> {
  confirmedPriceSnapshot: JsonValue;
  demandLines: CreateRentalDemandLineInput[];
  assignedAssets: CreateAssignedAssetInput[];
  assetBlocks?: AssetBlock[];
}

export interface ReconstituteRentalProps {
  id: RentalId;
  tenantId: string;
  rentalNumber: number;
  branchId: string;
  rentalCustomerId?: string;
  status: RentalStatus;
  period: RentalPeriod;
  source?: RentalSource;
  fulfillmentMethod?: FulfillmentMethod;
  notes?: string;
  insuranceSelected?: boolean;
  bookingSnapshot?: BookingSnapshot;
  deliveryDetails?: RentalDeliveryDetails;
  priceSnapshot?: JsonValue;
  confirmedPriceSnapshot?: JsonValue;
  selections: RentalSelection[];
  demandLines: RentalDemandLine[];
  assignedAssets: AssignedAsset[];
  assetBlocks: AssetBlock[];
  createdAt?: Date;
  version?: number;
  updatedAt?: Date;
  cancelledAt?: Date;
  confirmedAt?: Date;
}

interface CreateRentalFromEntitiesProps {
  id?: RentalId;
  tenantId: string;
  rentalNumber: number;
  branchId: string;
  rentalCustomerId?: string;
  period: RentalPeriod;
  source?: RentalSource;
  fulfillmentMethod?: FulfillmentMethod;
  notes?: string;
  insuranceSelected?: boolean;
  bookingSnapshot?: BookingSnapshot;
  deliveryDetails?: RentalDeliveryDetails;
  priceSnapshot?: JsonSnapshot;
  confirmedPriceSnapshot?: ConfirmedPriceSnapshot;
  selections: RentalSelection[];
  demandLines: RentalDemandLine[];
  assignedAssets: AssignedAsset[];
  assetBlocks: AssetBlock[];
  createdAt?: Date;
  version?: number;
  updatedAt?: Date;
  cancelledAt?: Date;
  confirmedAt?: Date;
}

export class Rental extends AggregateRootBase {
  readonly id: RentalId;
  private props: RentalProps;

  private constructor(id: RentalId, props: RentalProps) {
    super();
    this.id = id;
    this.props = props;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get rentalNumber(): number {
    return this.props.rentalNumber;
  }

  get branchId(): string {
    return this.props.branchId;
  }

  get rentalCustomerId(): string | undefined {
    return this.props.rentalCustomerId;
  }

  get status(): RentalStatus {
    return this.props.status;
  }

  get period(): RentalPeriod {
    return this.props.period;
  }

  get source(): RentalSource | undefined {
    return this.props.source;
  }

  get fulfillmentMethod(): FulfillmentMethod | undefined {
    return this.props.fulfillmentMethod;
  }

  get notes(): string | undefined {
    return this.props.notes;
  }

  get insuranceSelected(): boolean | undefined {
    return this.props.insuranceSelected;
  }

  get bookingSnapshot(): BookingSnapshot | undefined {
    return this.props.bookingSnapshot;
  }

  get deliveryDetails(): RentalDeliveryDetails | undefined {
    return this.props.deliveryDetails ? { ...this.props.deliveryDetails } : undefined;
  }

  get priceSnapshot(): JsonSnapshot | ConfirmedPriceSnapshot | undefined {
    return this.props.confirmedPriceSnapshot ?? this.props.priceSnapshot;
  }

  get confirmedPriceSnapshot(): ConfirmedPriceSnapshot | undefined {
    return this.props.confirmedPriceSnapshot;
  }

  get selections(): readonly RentalSelection[] {
    return [...this.props.selections];
  }

  get currentSelections(): readonly RentalSelection[] {
    return this.props.selections.filter((selection) => selection.isCurrent);
  }

  get demandLines(): readonly RentalDemandLine[] {
    return [...this.props.demandLines];
  }

  get currentDemandLines(): readonly RentalDemandLine[] {
    return this.props.demandLines.filter((line) => line.isCurrent);
  }

  get assignedAssets(): readonly AssignedAsset[] {
    return [...this.props.assignedAssets];
  }

  get currentAssignedAssets(): readonly AssignedAsset[] {
    return this.props.assignedAssets.filter((assignment) => assignment.isActive);
  }

  get assetBlocks(): readonly AssetBlock[] {
    return [...this.props.assetBlocks];
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt ? new Date(this.props.createdAt) : undefined;
  }

  get version(): number {
    return this.props.version ?? 0;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt ? new Date(this.props.updatedAt) : undefined;
  }

  get cancelledAt(): Date | undefined {
    return this.props.cancelledAt ? new Date(this.props.cancelledAt) : undefined;
  }

  get confirmedAt(): Date | undefined {
    return this.props.confirmedAt ? new Date(this.props.confirmedAt) : undefined;
  }

  static createPending(props: CreatePendingRentalProps): Result<Rental, RentalCommitmentError> {
    const rentalId = props.id ?? (randomUUID() as RentalId);

    const selections = this.createSelections(rentalId, props.tenantId, props.selections);
    if (selections.isErr()) {
      return err(selections.error);
    }

    const demandLines = this.createDemandLines(rentalId, props.tenantId, props.demandLines ?? []);
    if (demandLines.isErr()) {
      return err(demandLines.error);
    }

    return this.createFromEntities(RentalStatus.Pending, {
      ...props,
      id: rentalId,
      priceSnapshot: props.priceSnapshot === undefined ? undefined : new JsonSnapshot(props.priceSnapshot),
      selections: selections.value,
      demandLines: demandLines.value,
      assignedAssets: [],
      assetBlocks: [],
    });
  }

  static createDraft(props: CreateDraftRentalProps): Result<Rental, RentalCommitmentError> {
    const rentalId = props.id ?? (randomUUID() as RentalId);

    const selections = this.createSelections(rentalId, props.tenantId, props.selections);
    if (selections.isErr()) {
      return err(selections.error);
    }

    const demandLines = this.createDemandLines(rentalId, props.tenantId, props.demandLines ?? []);
    if (demandLines.isErr()) {
      return err(demandLines.error);
    }

    return this.createFromEntities(RentalStatus.Draft, {
      ...props,
      id: rentalId,
      priceSnapshot: props.priceSnapshot === undefined ? undefined : new JsonSnapshot(props.priceSnapshot),
      selections: selections.value,
      demandLines: demandLines.value,
      assignedAssets: [],
      assetBlocks: [],
    });
  }

  static createConfirmed(props: CreateConfirmedRentalProps): Result<Rental, RentalCommitmentError> {
    const confirmedPriceSnapshot = ConfirmedPriceSnapshot.create(props.confirmedPriceSnapshot);
    if (confirmedPriceSnapshot.isErr()) {
      return err(confirmedPriceSnapshot.error);
    }

    const rentalId = props.id ?? (randomUUID() as RentalId);

    const selections = this.createSelections(rentalId, props.tenantId, props.selections);
    if (selections.isErr()) {
      return err(selections.error);
    }

    const demandLines = this.createDemandLines(rentalId, props.tenantId, props.demandLines);
    if (demandLines.isErr()) {
      return err(demandLines.error);
    }

    const assignedAssets = this.createAssignedAssets(
      rentalId,
      props.tenantId,
      props.period.start,
      props.assignedAssets,
    );
    if (assignedAssets.isErr()) {
      return err(assignedAssets.error);
    }

    const assetBlocks = props.assetBlocks
      ? ok(props.assetBlocks)
      : this.createEquipmentBlocksForAssignedAssets({
          tenantId: props.tenantId,
          rentalId,
          period: props.period,
          assignedAssets: assignedAssets.value,
        });

    if (assetBlocks.isErr()) {
      return err(assetBlocks.error);
    }

    const confirmedAt = new Date();
    const rental = this.createFromEntities(RentalStatus.Confirmed, {
      ...props,
      id: rentalId,
      confirmedPriceSnapshot: confirmedPriceSnapshot.value,
      selections: selections.value,
      demandLines: demandLines.value,
      assignedAssets: assignedAssets.value,
      assetBlocks: assetBlocks.value,
      confirmedAt,
    });

    if (rental.isErr()) {
      return err(rental.error);
    }

    rental.value.recordRentalConfirmedEvent(confirmedAt);

    return ok(rental.value);
  }

  static reconstitute(props: ReconstituteRentalProps): Result<Rental, RentalCommitmentError> {
    let confirmedPriceSnapshot: ConfirmedPriceSnapshot | undefined;

    if (props.confirmedPriceSnapshot !== undefined) {
      const snapshot = ConfirmedPriceSnapshot.create(props.confirmedPriceSnapshot);

      if (snapshot.isErr()) {
        return err(snapshot.error);
      }

      confirmedPriceSnapshot = snapshot.value;
    }

    return this.createFromEntities(props.status, {
      ...props,
      priceSnapshot: props.priceSnapshot === undefined ? undefined : new JsonSnapshot(props.priceSnapshot),
      confirmedPriceSnapshot,
      selections: [...props.selections],
      demandLines: [...props.demandLines],
      assignedAssets: [...props.assignedAssets],
      assetBlocks: [...props.assetBlocks],
      createdAt: props.createdAt ? new Date(props.createdAt) : undefined,
      version: props.version ?? 0,
      updatedAt: props.updatedAt ? new Date(props.updatedAt) : undefined,
      cancelledAt: props.cancelledAt ? new Date(props.cancelledAt) : undefined,
      confirmedAt: props.confirmedAt ? new Date(props.confirmedAt) : undefined,
    });
  }

  editUnconfirmed(params: EditUnconfirmedRentalProps): Result<void, RentalCommitmentError> {
    if (!this.isUnconfirmed()) {
      return err(new RentalCannotBeEditedFromStatusError(this.id, this.status));
    }

    if (this.props.assignedAssets.length > 0 || this.props.assetBlocks.length > 0) {
      return err(new RentalContainsOperationalCommitmentsError(this.id));
    }

    const selections = Rental.createSelections(this.id, this.tenantId, params.selections);
    if (selections.isErr()) {
      return err(selections.error);
    }

    const demandLines = Rental.createDemandLines(this.id, this.tenantId, params.demandLines);
    if (demandLines.isErr()) {
      return err(demandLines.error);
    }

    const candidate = Rental.createFromEntities(this.status, {
      id: this.id,
      tenantId: this.tenantId,
      rentalNumber: this.rentalNumber,
      branchId: params.branchId,
      rentalCustomerId: this.rentalCustomerId,
      period: params.period,
      source: this.source,
      fulfillmentMethod: params.fulfillmentMethod,
      notes: params.notes,
      insuranceSelected: params.insuranceSelected,
      bookingSnapshot: this.bookingSnapshot,
      deliveryDetails: params.deliveryDetails,
      priceSnapshot: new JsonSnapshot(params.priceSnapshot),
      selections: selections.value,
      demandLines: demandLines.value,
      assignedAssets: [...this.props.assignedAssets],
      assetBlocks: [...this.props.assetBlocks],
      createdAt: this.createdAt,
      version: this.version,
      updatedAt: this.updatedAt,
      cancelledAt: this.cancelledAt,
      confirmedAt: this.confirmedAt,
    });

    if (candidate.isErr()) {
      return err(candidate.error);
    }

    this.props = candidate.value.props;

    return ok(undefined);
  }

  changeConfirmedDetails(params: ChangeConfirmedRentalDetailsProps): Result<void, RentalCommitmentError> {
    if (this.status !== RentalStatus.Confirmed) {
      return err(new RentalCannotBeEditedFromStatusError(this.id, this.status));
    }
    if (params.operationTime >= this.period.end) {
      return err(new RentalPeriodHasEndedError(this.id));
    }
    if (
      params.operationTime >= this.period.start &&
      (params.fulfillmentMethod !== this.fulfillmentMethod ||
        !sameDeliveryDetails(params.deliveryDetails, this.deliveryDetails))
    ) {
      return err(
        new RentalInvalidFieldError(
          'fulfillmentMethod',
          'fulfillment method and delivery details cannot change after the rental starts',
        ),
      );
    }

    const confirmedPriceSnapshot = params.confirmedPriceSnapshot
      ? ConfirmedPriceSnapshot.create(params.confirmedPriceSnapshot)
      : ok(this.confirmedPriceSnapshot);
    if (confirmedPriceSnapshot.isErr()) return err(confirmedPriceSnapshot.error);

    const candidate = Rental.createFromEntities(RentalStatus.Confirmed, {
      id: this.id,
      tenantId: this.tenantId,
      rentalNumber: this.rentalNumber,
      branchId: this.branchId,
      rentalCustomerId: this.rentalCustomerId,
      period: this.period,
      source: this.source,
      fulfillmentMethod: params.fulfillmentMethod,
      notes: params.notes,
      insuranceSelected: params.insuranceSelected,
      bookingSnapshot: this.bookingSnapshot,
      deliveryDetails: params.deliveryDetails,
      confirmedPriceSnapshot: confirmedPriceSnapshot.value,
      selections: [...this.props.selections],
      demandLines: [...this.props.demandLines],
      assignedAssets: [...this.props.assignedAssets],
      assetBlocks: [...this.props.assetBlocks],
      createdAt: this.createdAt,
      version: this.version,
      updatedAt: this.updatedAt,
      cancelledAt: this.cancelledAt,
      confirmedAt: this.confirmedAt,
    });
    if (candidate.isErr()) return err(candidate.error);

    this.props = candidate.value.props;
    this.recordConfirmedRentalEditedEvent(params.operationTime);
    return ok(undefined);
  }

  addConfirmedSelection(params: AddConfirmedRentalSelectionProps): Result<void, RentalCommitmentError> {
    if (this.status !== RentalStatus.Confirmed) {
      return err(new RentalCannotBeEditedFromStatusError(this.id, this.status));
    }

    const effectiveAt = params.operationTime < this.period.start ? this.period.start : params.operationTime;
    if (effectiveAt >= this.period.end) {
      return err(new RentalPeriodHasEndedError(this.id));
    }

    const selection = RentalSelection.create({
      ...params.selection,
      tenantId: this.tenantId,
      rentalId: this.id,
      createdAt: params.operationTime,
    });
    if (selection.isErr()) return err(selection.error);

    const demandLines = Rental.createDemandLines(
      this.id,
      this.tenantId,
      params.demandLines.map((line) => ({ ...line, createdAt: params.operationTime })),
    );
    if (demandLines.isErr()) return err(demandLines.error);

    const assignedAssets = Rental.createAssignedAssets(
      this.id,
      this.tenantId,
      effectiveAt,
      params.assignedAssets.map((assignment) => ({ ...assignment, createdAt: params.operationTime })),
    );
    if (assignedAssets.isErr()) return err(assignedAssets.error);

    const assetBlocks = Rental.createEquipmentBlocksForAssignedAssets({
      tenantId: this.tenantId,
      rentalId: this.id,
      period: new RentalPeriod(effectiveAt, this.period.end),
      assignedAssets: assignedAssets.value,
    });
    if (assetBlocks.isErr()) return err(assetBlocks.error);

    const confirmedPriceSnapshot = ConfirmedPriceSnapshot.create(params.confirmedPriceSnapshot);
    if (confirmedPriceSnapshot.isErr()) return err(confirmedPriceSnapshot.error);

    const candidate = Rental.createFromEntities(RentalStatus.Confirmed, {
      id: this.id,
      tenantId: this.tenantId,
      rentalNumber: this.rentalNumber,
      branchId: this.branchId,
      rentalCustomerId: this.rentalCustomerId,
      period: this.period,
      source: this.source,
      fulfillmentMethod: this.fulfillmentMethod,
      notes: this.notes,
      insuranceSelected: this.insuranceSelected,
      bookingSnapshot: this.bookingSnapshot,
      deliveryDetails: this.deliveryDetails,
      confirmedPriceSnapshot: confirmedPriceSnapshot.value,
      selections: [...this.props.selections, selection.value],
      demandLines: [...this.props.demandLines, ...demandLines.value],
      assignedAssets: [...this.props.assignedAssets, ...assignedAssets.value],
      assetBlocks: [...this.props.assetBlocks, ...assetBlocks.value],
      createdAt: this.createdAt,
      version: this.version,
      updatedAt: this.updatedAt,
      cancelledAt: this.cancelledAt,
      confirmedAt: this.confirmedAt,
    });
    if (candidate.isErr()) return err(candidate.error);

    this.props = candidate.value.props;
    this.recordConfirmedRentalEditedEvent(params.operationTime);
    return ok(undefined);
  }

  removeConfirmedSelection(params: RemoveConfirmedSelectionProps): Result<void, RentalCommitmentError> {
    if (this.status !== RentalStatus.Confirmed) {
      return err(new RentalCannotBeEditedFromStatusError(this.id, this.status));
    }
    const selection = this.currentSelections.find((candidate) => candidate.id === params.selectionId);
    if (!selection) return err(new RentalSelectionNotFoundError(this.id, params.selectionId));
    if (this.currentSelections.length === 1) return err(new RentalMustContainSelectionError());

    const effectiveAt = params.operationTime < this.period.start ? this.period.start : params.operationTime;
    if (effectiveAt >= this.period.end) return err(new RentalPeriodHasEndedError(this.id));

    const targetDemandLines = this.currentDemandLines.filter((line) => line.rentalSelectionId === selection.id);
    if (targetDemandLines.length === 0) {
      return err(new RentalInvalidFieldError('demandLines', 'target selection must have persisted current demand'));
    }
    const targetDemandLineIds = new Set(targetDemandLines.map((line) => line.id));

    const removedSelection = selection.removeAt(params.operationTime);

    const nextDemandLines = this.props.demandLines.map((line) =>
      targetDemandLineIds.has(line.id) ? line.removeAt(params.operationTime) : line,
    );

    let nextAssignedAssets = [...this.props.assignedAssets];
    let nextAssetBlocks = [...this.props.assetBlocks];
    const assignmentsToRelease = this.currentAssignedAssets.filter((assignment) =>
      targetDemandLineIds.has(assignment.rentalDemandLineId),
    );
    for (const assignment of assignmentsToRelease) {
      const block = nextAssetBlocks.find(
        (candidate) =>
          candidate.isActive &&
          candidate.blockType === AssetBlockType.Equipment &&
          candidate.assetId === assignment.assetId,
      );
      if (!block) return err(new ConfirmedRentalRequiresActiveBlocksError(this.id, assignment.assetId));
      if (effectiveAt <= assignment.effectiveFrom) {
        nextAssignedAssets = nextAssignedAssets.filter((candidate) => candidate.id !== assignment.id);
        nextAssetBlocks = nextAssetBlocks.filter((candidate) => candidate.id !== block.id);
        continue;
      }
      const assignmentCopy = AssignedAsset.reconstitute({
        id: assignment.id,
        tenantId: assignment.tenantId,
        rentalId: assignment.rentalId,
        rentalDemandLineId: assignment.rentalDemandLineId,
        assetId: assignment.assetId,
        ownershipSnapshot: assignment.ownershipSnapshot,
        effectiveFrom: assignment.effectiveFrom,
        effectiveUntil: assignment.effectiveUntil,
        createdAt: assignment.createdAt,
      });
      const blockCopy = AssetBlock.reconstitute({
        id: block.id,
        tenantId: block.tenantId,
        rentalId: block.rentalId,
        assetId: block.assetId,
        period: block.period,
        blockType: block.blockType,
        createdAt: block.createdAt,
        releasedAt: block.releasedAt,
      });
      const closed = assignmentCopy.close(params.operationTime);
      if (closed.isErr()) return err(closed.error);
      const released = blockCopy.truncateAndRelease(params.operationTime);
      if (released.isErr()) return err(released.error);
      nextAssignedAssets = nextAssignedAssets.map((candidate) =>
        candidate.id === assignment.id ? assignmentCopy : candidate,
      );
      nextAssetBlocks = nextAssetBlocks.map((candidate) => (candidate.id === block.id ? blockCopy : candidate));
    }

    const price = ConfirmedPriceSnapshot.create(params.confirmedPriceSnapshot);
    if (price.isErr()) return err(price.error);
    const candidate = Rental.createFromEntities(RentalStatus.Confirmed, {
      ...this.props,
      id: this.id,
      confirmedPriceSnapshot: price.value,
      selections: this.props.selections.map((item) => (item.id === selection.id ? removedSelection : item)),
      demandLines: nextDemandLines,
      assignedAssets: nextAssignedAssets,
      assetBlocks: nextAssetBlocks,
    });
    if (candidate.isErr()) return err(candidate.error);
    this.props = candidate.value.props;
    this.recordConfirmedRentalEditedEvent(params.operationTime);
    return ok(undefined);
  }

  changeConfirmedSelectionQuantity(params: ChangeConfirmedSelectionQuantityProps): Result<void, RentalCommitmentError> {
    if (this.status !== RentalStatus.Confirmed)
      return err(new RentalCannotBeEditedFromStatusError(this.id, this.status));
    const selection = this.currentSelections.find((candidate) => candidate.id === params.selectionId);
    if (!selection) return err(new RentalSelectionNotFoundError(this.id, params.selectionId));
    if (!Number.isInteger(params.newQuantity) || params.newQuantity <= 0)
      return err(new RentalInvalidFieldError('quantity', 'must be a positive integer'));
    if (params.newQuantity === selection.quantity)
      return err(new RentalInvalidFieldError('quantity', 'must differ from the current quantity'));

    const effectiveAt = params.operationTime < this.period.start ? this.period.start : params.operationTime;
    if (effectiveAt >= this.period.end) return err(new RentalPeriodHasEndedError(this.id));
    const targetDemandLines = this.currentDemandLines.filter((line) => line.rentalSelectionId === selection.id);
    if (targetDemandLines.length === 0) {
      return err(new RentalInvalidFieldError('demandLines', 'target selection must have persisted demand'));
    }
    const nextQuantityByDemandLineId = new Map<RentalDemandLineId, number>();
    const reductionByDemandLineId = new Map<RentalDemandLineId, number>();
    for (const line of targetDemandLines) {
      if (selection.quantity <= 0 || line.quantity <= 0 || line.quantity % selection.quantity !== 0) {
        return err(
          new RentalInvalidFieldError('demandLines', 'persisted demand is not divisible by selection quantity'),
        );
      }
      const multiplier = line.quantity / selection.quantity;
      if (!Number.isInteger(multiplier) || multiplier <= 0)
        return err(new RentalInvalidFieldError('demandLines', 'derived quantity-per-item must be a positive integer'));
      const nextQuantity = params.newQuantity * multiplier;
      nextQuantityByDemandLineId.set(line.id, nextQuantity);
      reductionByDemandLineId.set(line.id, line.quantity - nextQuantity);
    }

    const increasing = params.newQuantity > selection.quantity;
    if (increasing && params.releaseAssetIds.length > 0)
      return err(new RentalInvalidFieldError('releaseAssetIds', 'must be empty when increasing quantity'));
    if (!increasing && params.releaseAssetIds.length === 0)
      return err(new RentalInvalidFieldError('releaseAssetIds', 'is required when decreasing quantity'));
    if (new Set(params.releaseAssetIds).size !== params.releaseAssetIds.length)
      return err(new RentalInvalidFieldError('releaseAssetIds', 'must contain unique asset IDs'));

    const releaseAssignments: AssignedAsset[] = [];
    if (!increasing) {
      const targetDemandIds = new Set(targetDemandLines.map((line) => line.id));
      const releaseCountByDemandId = new Map<RentalDemandLineId, number>();
      for (const assetId of params.releaseAssetIds) {
        const assignment = this.currentAssignedAssets.find((candidate) => candidate.assetId === assetId);
        if (!assignment) return err(new RentalAssignedAssetNotFoundError(this.id, assetId));
        if (!targetDemandIds.has(assignment.rentalDemandLineId))
          return err(
            new RentalInvalidFieldError(
              'releaseAssetIds',
              `asset "${assetId}" does not belong to the target selection`,
            ),
          );
        releaseAssignments.push(assignment);
        releaseCountByDemandId.set(
          assignment.rentalDemandLineId,
          (releaseCountByDemandId.get(assignment.rentalDemandLineId) ?? 0) + 1,
        );
      }
      for (const line of targetDemandLines) {
        if ((releaseCountByDemandId.get(line.id) ?? 0) !== reductionByDemandLineId.get(line.id))
          return err(
            new RentalInvalidFieldError('releaseAssetIds', 'release distribution must exactly match demand reduction'),
          );
      }
    }

    const nextSelection = selection.changeQuantity(params.newQuantity);
    if (nextSelection.isErr()) return err(nextSelection.error);
    const nextDemandLines: RentalDemandLine[] = [];
    for (const line of this.props.demandLines) {
      const quantity = nextQuantityByDemandLineId.get(line.id);
      if (quantity === undefined) {
        nextDemandLines.push(line);
        continue;
      }
      const changedLine = line.changeQuantity(quantity);
      if (changedLine.isErr()) return err(changedLine.error);
      nextDemandLines.push(changedLine.value);
    }

    let nextAssignedAssets = [...this.props.assignedAssets];
    let nextAssetBlocks = [...this.props.assetBlocks];
    if (increasing) {
      const additions = Rental.createAssignedAssets(
        this.id,
        this.tenantId,
        effectiveAt,
        params.newAssignments.map((assignment) => ({ ...assignment, createdAt: params.operationTime })),
      );
      if (additions.isErr()) return err(additions.error);
      const blocks = Rental.createEquipmentBlocksForAssignedAssets({
        tenantId: this.tenantId,
        rentalId: this.id,
        period: new RentalPeriod(effectiveAt, this.period.end),
        assignedAssets: additions.value,
      });
      if (blocks.isErr()) return err(blocks.error);
      nextAssignedAssets.push(...additions.value);
      nextAssetBlocks.push(...blocks.value);
    } else {
      for (const assignment of releaseAssignments) {
        const currentBlock = nextAssetBlocks.find(
          (block) =>
            block.isActive && block.blockType === AssetBlockType.Equipment && block.assetId === assignment.assetId,
        );
        if (!currentBlock) return err(new ConfirmedRentalRequiresActiveBlocksError(this.id, assignment.assetId));
        if (effectiveAt <= assignment.effectiveFrom) {
          nextAssignedAssets = nextAssignedAssets.filter((candidate) => candidate.id !== assignment.id);
          nextAssetBlocks = nextAssetBlocks.filter((candidate) => candidate.id !== currentBlock.id);
          continue;
        }
        const assignmentCopy = AssignedAsset.reconstitute({
          id: assignment.id,
          tenantId: assignment.tenantId,
          rentalId: assignment.rentalId,
          rentalDemandLineId: assignment.rentalDemandLineId,
          assetId: assignment.assetId,
          ownershipSnapshot: assignment.ownershipSnapshot,
          effectiveFrom: assignment.effectiveFrom,
          effectiveUntil: assignment.effectiveUntil,
          createdAt: assignment.createdAt,
        });
        const blockCopy = AssetBlock.reconstitute({
          id: currentBlock.id,
          tenantId: currentBlock.tenantId,
          rentalId: currentBlock.rentalId,
          assetId: currentBlock.assetId,
          period: currentBlock.period,
          blockType: currentBlock.blockType,
          createdAt: currentBlock.createdAt,
          releasedAt: currentBlock.releasedAt,
        });
        const closed = assignmentCopy.close(params.operationTime);
        if (closed.isErr()) return err(closed.error);
        const released = blockCopy.truncateAndRelease(params.operationTime);
        if (released.isErr()) return err(released.error);
        nextAssignedAssets = nextAssignedAssets.map((candidate) =>
          candidate.id === assignment.id ? assignmentCopy : candidate,
        );
        nextAssetBlocks = nextAssetBlocks.map((candidate) =>
          candidate.id === currentBlock.id ? blockCopy : candidate,
        );
      }
    }

    const price = ConfirmedPriceSnapshot.create(params.confirmedPriceSnapshot);
    if (price.isErr()) return err(price.error);
    const candidate = Rental.createFromEntities(RentalStatus.Confirmed, {
      id: this.id,
      tenantId: this.tenantId,
      rentalNumber: this.rentalNumber,
      branchId: this.branchId,
      rentalCustomerId: this.rentalCustomerId,
      period: this.period,
      source: this.source,
      fulfillmentMethod: this.fulfillmentMethod,
      notes: this.notes,
      insuranceSelected: this.insuranceSelected,
      bookingSnapshot: this.bookingSnapshot,
      deliveryDetails: this.deliveryDetails,
      confirmedPriceSnapshot: price.value,
      selections: this.props.selections.map((candidate) =>
        candidate.id === selection.id ? nextSelection.value : candidate,
      ),
      demandLines: nextDemandLines,
      assignedAssets: nextAssignedAssets,
      assetBlocks: nextAssetBlocks,
      createdAt: this.createdAt,
      version: this.version,
      updatedAt: this.updatedAt,
      cancelledAt: this.cancelledAt,
      confirmedAt: this.confirmedAt,
    });
    if (candidate.isErr()) return err(candidate.error);
    this.props = candidate.value.props;
    this.recordConfirmedRentalEditedEvent(params.operationTime);
    return ok(undefined);
  }

  changeConfirmedPeriod(params: ChangeConfirmedPeriodProps): Result<void, RentalCommitmentError> {
    if (this.status !== RentalStatus.Confirmed) {
      return err(new RentalCannotBeEditedFromStatusError(this.id, this.status));
    }

    const samePeriod =
      params.newPeriod.start.getTime() === this.period.start.getTime() &&
      params.newPeriod.end.getTime() === this.period.end.getTime();
    if (samePeriod) return ok(undefined);

    if (params.operationTime >= this.period.end) return err(new RentalPeriodHasEndedError(this.id));

    const started = params.operationTime >= this.period.start;
    if (started && params.newPeriod.start.getTime() !== this.period.start.getTime()) {
      return err(new RentalInvalidFieldError('start', 'must equal the existing start after the rental has started'));
    }
    if (!started && params.newPeriod.start <= params.operationTime) {
      return err(new RentalPeriodCannotStartInPastError());
    }

    let newPeriod: RentalPeriod;
    try {
      newPeriod = new RentalPeriod(params.newPeriod.start, params.newPeriod.end);
    } catch {
      return err(new RentalInvalidFieldError('period', 'end must be after start'));
    }
    if (started && newPeriod.end <= params.operationTime) {
      return err(new RentalInvalidFieldError('end', 'must be after the operation time'));
    }

    const price = ConfirmedPriceSnapshot.create(params.confirmedPriceSnapshot);
    if (price.isErr()) return err(price.error);

    const activeAssignmentIds = new Set(this.currentAssignedAssets.map((assignment) => assignment.id));
    const nextAssignedAssets: AssignedAsset[] = [];
    for (const assignment of this.props.assignedAssets) {
      if (!activeAssignmentIds.has(assignment.id)) {
        nextAssignedAssets.push(assignment);
        continue;
      }
      if (!started && assignment.effectiveFrom.getTime() !== this.period.start.getTime()) {
        return err(
          new RentalInvalidFieldError(
            'assignedAssets',
            'all current assignments must start at the current rental start before moving the period',
          ),
        );
      }
      nextAssignedAssets.push(
        AssignedAsset.reconstitute({
          id: assignment.id,
          tenantId: assignment.tenantId,
          rentalId: assignment.rentalId,
          rentalDemandLineId: assignment.rentalDemandLineId,
          assetId: assignment.assetId,
          ownershipSnapshot: assignment.ownershipSnapshot,
          effectiveFrom: started ? assignment.effectiveFrom : newPeriod.start,
          effectiveUntil: assignment.effectiveUntil,
          createdAt: assignment.createdAt,
        }),
      );
    }

    const currentAssignmentByAssetId = new Map(
      nextAssignedAssets
        .filter((assignment) => assignment.isActive)
        .map((assignment) => [assignment.assetId, assignment]),
    );
    const nextAssetBlocks: AssetBlock[] = [];
    for (const block of this.props.assetBlocks) {
      if (!block.isActive || block.blockType !== AssetBlockType.Equipment) {
        nextAssetBlocks.push(block);
        continue;
      }
      const assignment = currentAssignmentByAssetId.get(block.assetId);
      if (!assignment) return err(new UnexpectedActiveAssetBlockError(this.id, block.id));
      nextAssetBlocks.push(
        AssetBlock.reconstitute({
          id: block.id,
          tenantId: block.tenantId,
          rentalId: block.rentalId,
          assetId: block.assetId,
          period: new RentalPeriod(assignment.effectiveFrom, newPeriod.end),
          blockType: block.blockType,
          createdAt: block.createdAt,
        }),
      );
    }

    const candidate = Rental.createFromEntities(RentalStatus.Confirmed, {
      ...this.props,
      id: this.id,
      period: newPeriod,
      confirmedPriceSnapshot: price.value,
      assignedAssets: nextAssignedAssets,
      assetBlocks: nextAssetBlocks,
    });
    if (candidate.isErr()) return err(candidate.error);

    this.props = candidate.value.props;
    this.recordConfirmedRentalEditedEvent(params.operationTime);
    return ok(undefined);
  }

  replaceConfirmedAssignedAsset(params: {
    currentAssignedAssetId: AssetId;
    replacementAssetId: AssetId;
    ownershipSnapshot: AssignedAssetOwnershipSnapshot;
    operationTime: Date;
  }): Result<void, RentalCommitmentError> {
    if (this.status !== RentalStatus.Confirmed) {
      return err(new RentalCannotBeEditedFromStatusError(this.id, this.status));
    }
    if (params.currentAssignedAssetId === params.replacementAssetId) {
      return err(new RentalInvalidFieldError('replacementAssetId', 'must differ from currentAssignedAssetId'));
    }

    const effectiveAt = params.operationTime < this.period.start ? this.period.start : params.operationTime;
    if (effectiveAt >= this.period.end) {
      return err(new RentalPeriodHasEndedError(this.id));
    }

    const currentAssignment = this.currentAssignedAssets.find(
      (assignment) => assignment.assetId === params.currentAssignedAssetId,
    );
    if (!currentAssignment) {
      return err(new RentalAssignedAssetNotFoundError(this.id, params.currentAssignedAssetId));
    }

    const replacementAssignment = AssignedAsset.create({
      tenantId: this.tenantId,
      rentalId: this.id,
      rentalDemandLineId: currentAssignment.rentalDemandLineId,
      assetId: params.replacementAssetId,
      ownershipSnapshot: params.ownershipSnapshot,
      effectiveFrom: effectiveAt,
      createdAt: params.operationTime,
    });
    if (replacementAssignment.isErr()) return err(replacementAssignment.error);

    const replacementBlock = AssetBlock.create({
      tenantId: this.tenantId,
      rentalId: this.id,
      assetId: params.replacementAssetId,
      period: new RentalPeriod(effectiveAt, this.period.end),
      blockType: AssetBlockType.Equipment,
      createdAt: params.operationTime,
    });
    if (replacementBlock.isErr()) return err(replacementBlock.error);

    const isPlannedReplacement = effectiveAt <= currentAssignment.effectiveFrom;
    let nextAssignedAssets: AssignedAsset[];
    let nextAssetBlocks: AssetBlock[];

    if (isPlannedReplacement) {
      nextAssignedAssets = [
        ...this.props.assignedAssets.filter((assignment) => assignment.id !== currentAssignment.id),
        replacementAssignment.value,
      ];
      nextAssetBlocks = [
        ...this.props.assetBlocks.filter(
          (block) =>
            !(
              block.isActive &&
              block.blockType === AssetBlockType.Equipment &&
              block.assetId === params.currentAssignedAssetId
            ),
        ),
        replacementBlock.value,
      ];
    } else {
      const historicalAssignment = AssignedAsset.create({
        id: currentAssignment.id,
        tenantId: currentAssignment.tenantId,
        rentalId: currentAssignment.rentalId,
        rentalDemandLineId: currentAssignment.rentalDemandLineId,
        assetId: currentAssignment.assetId,
        ownershipSnapshot: currentAssignment.ownershipSnapshot,
        effectiveFrom: currentAssignment.effectiveFrom,
        createdAt: currentAssignment.createdAt,
      });
      if (historicalAssignment.isErr()) return err(historicalAssignment.error);

      const currentBlock = this.props.assetBlocks.find(
        (block) =>
          block.isActive &&
          block.blockType === AssetBlockType.Equipment &&
          block.assetId === params.currentAssignedAssetId,
      );
      if (!currentBlock) {
        return err(new ConfirmedRentalRequiresActiveBlocksError(this.id, params.currentAssignedAssetId));
      }

      const historicalBlock = AssetBlock.create({
        id: currentBlock.id,
        tenantId: currentBlock.tenantId,
        rentalId: currentBlock.rentalId,
        assetId: currentBlock.assetId,
        period: currentBlock.period,
        blockType: currentBlock.blockType,
        createdAt: currentBlock.createdAt,
      });
      if (historicalBlock.isErr()) return err(historicalBlock.error);

      const closeAssignment = historicalAssignment.value.close(effectiveAt);
      if (closeAssignment.isErr()) return err(closeAssignment.error);
      const truncateBlock = historicalBlock.value.truncateAndRelease(effectiveAt);
      if (truncateBlock.isErr()) return err(truncateBlock.error);

      nextAssignedAssets = [
        ...this.props.assignedAssets.filter((assignment) => assignment.id !== currentAssignment.id),
        historicalAssignment.value,
        replacementAssignment.value,
      ];
      nextAssetBlocks = [
        ...this.props.assetBlocks.filter((block) => block.id !== currentBlock.id),
        historicalBlock.value,
        replacementBlock.value,
      ];
    }

    const candidate = Rental.createFromEntities(RentalStatus.Confirmed, {
      id: this.id,
      tenantId: this.tenantId,
      rentalNumber: this.rentalNumber,
      branchId: this.branchId,
      rentalCustomerId: this.rentalCustomerId,
      period: this.period,
      source: this.source,
      fulfillmentMethod: this.fulfillmentMethod,
      notes: this.notes,
      insuranceSelected: this.insuranceSelected,
      bookingSnapshot: this.bookingSnapshot,
      deliveryDetails: this.deliveryDetails,
      confirmedPriceSnapshot: this.confirmedPriceSnapshot,
      selections: [...this.props.selections],
      demandLines: [...this.props.demandLines],
      assignedAssets: nextAssignedAssets,
      assetBlocks: nextAssetBlocks,
      createdAt: this.createdAt,
      version: this.version,
      updatedAt: this.updatedAt,
      cancelledAt: this.cancelledAt,
      confirmedAt: this.confirmedAt,
    });
    if (candidate.isErr()) return err(candidate.error);

    this.props = candidate.value.props;
    this.recordConfirmedRentalEditedEvent(params.operationTime);
    return ok(undefined);
  }

  assignCustomer(customerId: string): Result<void, RentalCommitmentError> {
    if (this.status !== RentalStatus.Draft) {
      return err(new RentalMustBeDraftToAssignCustomerError(this.id));
    }

    if (customerId.trim().length === 0) {
      return err(new RentalInvalidFieldError('rentalCustomerId', 'must not be blank'));
    }

    this.props.rentalCustomerId = customerId;

    return ok(undefined);
  }

  cancel(cancelledAt = new Date()): Result<void, RentalCommitmentError> {
    if (this.status === RentalStatus.Cancelled) {
      return err(new RentalAlreadyCancelledError(this.id));
    }

    if (this.status === RentalStatus.Completed) {
      return err(new RentalCannotBeCancelledFromStatusError(this.id, this.status));
    }

    const releasedAt = new Date(cancelledAt);

    for (const block of this.props.assetBlocks) {
      const release = block.release(releasedAt);

      if (release.isErr()) {
        return err(release.error);
      }
    }

    this.props.status = RentalStatus.Cancelled;
    this.props.cancelledAt = releasedAt;
    this.recordRentalCancelledEvent(releasedAt);

    return ok(undefined);
  }

  confirm(params: {
    assignedAssets: CreateAssignedAssetInput[];
    confirmedAt?: Date;
    assetBlocks?: AssetBlock[];
  }): Result<void, RentalCommitmentError> {
    if (!this.canBeConfirmed()) {
      return err(new RentalCannotBeConfirmedFromStatusError(this.id, this.status));
    }

    if (!this.rentalCustomerId) {
      return err(new RentalConfirmationRequiresCustomerError(this.id));
    }

    const confirmedPriceSnapshot = this.createConfirmedPriceSnapshotFromCurrentPrice();
    if (confirmedPriceSnapshot.isErr()) {
      return err(confirmedPriceSnapshot.error);
    }

    const assignedAssets = Rental.createAssignedAssets(
      this.id,
      this.tenantId,
      this.period.start,
      params.assignedAssets,
    );

    if (assignedAssets.isErr()) {
      return err(assignedAssets.error);
    }

    const assetBlocks = this.resolveConfirmationAssetBlocks({
      assignedAssets: assignedAssets.value,
      assetBlocks: params.assetBlocks,
    });

    if (assetBlocks.isErr()) {
      return err(assetBlocks.error);
    }

    const confirmedStateValidation = this.validateConfirmedState({
      confirmedPriceSnapshot: confirmedPriceSnapshot.value,
      demandLines: this.props.demandLines,
      assignedAssets: assignedAssets.value,
      assetBlocks: assetBlocks.value,
      period: this.period,
    });

    if (confirmedStateValidation.isErr()) {
      return err(confirmedStateValidation.error);
    }

    this.props.status = RentalStatus.Confirmed;
    this.props.confirmedPriceSnapshot = confirmedPriceSnapshot.value;
    this.props.assignedAssets = assignedAssets.value;
    this.props.assetBlocks = assetBlocks.value;
    const confirmedAt = params.confirmedAt ? new Date(params.confirmedAt) : new Date();
    this.props.confirmedAt = confirmedAt;
    this.recordRentalConfirmedEvent(confirmedAt);

    return ok(undefined);
  }

  private recordRentalCancelledEvent(cancelledAt: Date): void {
    this.recordDomainEvent(
      new RentalCancelledDomainEvent(this.tenantId, this.id, this.rentalCustomerId ?? null, this.branchId, cancelledAt),
    );
  }

  private recordConfirmedRentalEditedEvent(occurredAt: Date): void {
    if (!this.rentalCustomerId) {
      return;
    }

    this.recordDomainEvent(
      new ConfirmedRentalEditedDomainEvent(
        this.tenantId,
        this.id,
        this.rentalCustomerId,
        this.branchId,
        RentalStatus.Confirmed,
        this.fulfillmentMethod ?? FulfillmentMethod.Pickup,
        this.period.start,
        this.period.end,
        occurredAt,
      ),
    );
  }

  private recordRentalConfirmedEvent(occurredAt: Date): void {
    if (!this.rentalCustomerId) {
      return;
    }

    this.recordDomainEvent(
      new RentalConfirmedDomainEvent(
        this.tenantId,
        this.id,
        this.rentalNumber,
        this.rentalCustomerId,
        this.branchId,
        RentalStatus.Confirmed,
        this.fulfillmentMethod ?? FulfillmentMethod.Pickup,
        this.period.start,
        this.period.end,
        occurredAt,
      ),
    );
  }

  private createConfirmedPriceSnapshotFromCurrentPrice(): Result<ConfirmedPriceSnapshot, RentalCommitmentError> {
    if (!this.props.priceSnapshot) {
      return err(new ConfirmedRentalRequiresPriceSnapshotError(this.id));
    }

    return ConfirmedPriceSnapshot.create(this.props.priceSnapshot.toJSON());
  }

  private resolveConfirmationAssetBlocks(params: {
    assignedAssets: readonly AssignedAsset[];
    assetBlocks?: readonly AssetBlock[];
  }): Result<AssetBlock[], RentalCommitmentError> {
    if (params.assetBlocks) {
      return ok([...params.assetBlocks]);
    }

    return Rental.createEquipmentBlocksForAssignedAssets({
      tenantId: this.tenantId,
      rentalId: this.id,
      period: this.period,
      assignedAssets: params.assignedAssets,
    });
  }

  private canBeConfirmed(): boolean {
    return this.isUnconfirmed();
  }

  private isUnconfirmed(): boolean {
    return this.status === RentalStatus.Pending || this.status === RentalStatus.Draft;
  }

  private isOperationallyCommitted(): boolean {
    return this.status === RentalStatus.Confirmed;
  }

  private validateInvariants(): Result<void, RentalCommitmentError> {
    const baseValidation = this.validateBaseInvariants();
    if (baseValidation.isErr()) {
      return err(baseValidation.error);
    }

    if (this.isUnconfirmed()) {
      return this.validateUnconfirmedInvariants();
    }

    if (this.isOperationallyCommitted()) {
      return this.validateConfirmedInvariants();
    }

    return ok(undefined);
  }

  private validateBaseInvariants(): Result<void, RentalCommitmentError> {
    if (this.currentSelections.length === 0) {
      return err(new RentalMustContainSelectionError());
    }

    const duplicateSelectionValidation = RentalSelection.ensureNoDuplicateOffers(this.currentSelections);
    if (duplicateSelectionValidation.isErr()) {
      return err(duplicateSelectionValidation.error);
    }

    const deliveryValidation = this.validateDeliveryDetailsInvariant();
    if (deliveryValidation.isErr()) {
      return err(deliveryValidation.error);
    }

    return this.validateChildOwnershipAndTraceability();
  }

  private validateUnconfirmedInvariants(): Result<void, RentalCommitmentError> {
    if (this.props.assignedAssets.length > 0) {
      return err(new RentalInvalidFieldError('assignedAssets', 'pending or draft rentals cannot have assigned assets'));
    }

    if (this.props.assetBlocks.some((block) => block.isActive)) {
      return err(
        new RentalInvalidFieldError('assetBlocks', 'pending or draft rentals cannot have active asset blocks'),
      );
    }

    return ok(undefined);
  }

  private validateConfirmedInvariants(): Result<void, RentalCommitmentError> {
    return this.validateConfirmedState({
      confirmedPriceSnapshot: this.props.confirmedPriceSnapshot,
      demandLines: this.currentDemandLines,
      assignedAssets: this.props.assignedAssets,
      assetBlocks: this.props.assetBlocks,
      period: this.period,
    });
  }

  private validateConfirmedState(params: {
    confirmedPriceSnapshot?: ConfirmedPriceSnapshot;
    demandLines: readonly RentalDemandLine[];
    assignedAssets: readonly AssignedAsset[];
    assetBlocks: readonly AssetBlock[];
    period: RentalPeriod;
  }): Result<void, RentalCommitmentError> {
    const requiredStateValidation = this.validateConfirmedRequiredState({
      confirmedPriceSnapshot: params.confirmedPriceSnapshot,
      demandLines: params.demandLines,
    });

    if (requiredStateValidation.isErr()) {
      return err(requiredStateValidation.error);
    }

    const currentAssignedAssets = params.assignedAssets.filter((assignment) => assignment.isActive);
    const currentDemandLineIds = new Set(params.demandLines.map((line) => line.id));

    for (const assignment of currentAssignedAssets) {
      if (!currentDemandLineIds.has(assignment.rentalDemandLineId)) {
        return err(new CurrentAssignedAssetDemandMismatchError(this.id, assignment.id));
      }
    }

    const duplicateAssetValidation = this.validateNoDuplicateAssignedAssets(currentAssignedAssets);
    if (duplicateAssetValidation.isErr()) {
      return err(duplicateAssetValidation.error);
    }

    const assignmentCompletenessValidation = this.validateCompleteDemandLineAssignments({
      demandLines: params.demandLines,
      assignedAssets: currentAssignedAssets,
    });

    if (assignmentCompletenessValidation.isErr()) {
      return err(assignmentCompletenessValidation.error);
    }

    return this.validateActiveEquipmentBlocks({
      assignedAssets: currentAssignedAssets,
      assetBlocks: params.assetBlocks,
      period: params.period,
    });
  }

  private validateConfirmedRequiredState(params: {
    confirmedPriceSnapshot?: ConfirmedPriceSnapshot;
    demandLines: readonly RentalDemandLine[];
  }): Result<void, RentalCommitmentError> {
    if (!params.confirmedPriceSnapshot) {
      return err(new ConfirmedRentalRequiresPriceSnapshotError(this.id));
    }

    if (params.demandLines.length === 0) {
      return err(new ConfirmedRentalRequiresEquipmentDemandError(this.id));
    }

    return ok(undefined);
  }

  private validateDeliveryDetailsInvariant(): Result<void, RentalCommitmentError> {
    if (this.fulfillmentMethod === FulfillmentMethod.Delivery) {
      if (!this.props.deliveryDetails) {
        return err(new RentalInvalidFieldError('deliveryDetails', 'delivery rentals require delivery details'));
      }

      return ok(undefined);
    }

    if (this.props.deliveryDetails) {
      return err(new RentalInvalidFieldError('deliveryDetails', 'only delivery rentals can have delivery details'));
    }

    return ok(undefined);
  }

  private validateChildOwnershipAndTraceability(): Result<void, RentalCommitmentError> {
    const selectionIds = new Set(this.props.selections.map((selection) => selection.id));
    const demandLineIds = new Set(this.props.demandLines.map((line) => line.id));

    for (const child of [
      ...this.props.selections,
      ...this.props.demandLines,
      ...this.props.assignedAssets,
      ...this.props.assetBlocks,
    ]) {
      if (child.tenantId !== this.tenantId) {
        return err(new RentalChildTenantMismatchError(this.id, child.constructor.name, child.id));
      }

      if (child.rentalId !== this.id) {
        return err(new RentalChildRentalMismatchError(this.id, child.constructor.name, child.id));
      }
    }

    const selectionById = new Map(this.props.selections.map((selection) => [selection.id, selection]));
    for (const demandLine of this.props.demandLines) {
      if (!selectionIds.has(demandLine.rentalSelectionId)) {
        return err(new DemandLineSelectionMismatchError(this.id, demandLine.id));
      }
      const selection = selectionById.get(demandLine.rentalSelectionId)!;
      if (selection.removedAt?.getTime() !== demandLine.removedAt?.getTime()) {
        return err(
          new RentalInvalidFieldError(
            'removedAt',
            `demand line "${demandLine.id}" must match its source selection tombstone`,
          ),
        );
      }
    }

    for (const assignedAsset of this.props.assignedAssets) {
      if (!demandLineIds.has(assignedAsset.rentalDemandLineId)) {
        return err(new AssignedAssetDemandMismatchError(this.id, assignedAsset.id));
      }
    }

    return ok(undefined);
  }

  private validateNoDuplicateAssignedAssets(
    assignedAssets: readonly AssignedAsset[],
  ): Result<void, RentalCommitmentError> {
    const seen = new Set<AssetId>();

    for (const assignment of assignedAssets) {
      if (seen.has(assignment.assetId)) {
        return err(new DuplicateAssignedAssetError(this.id, assignment.assetId));
      }

      seen.add(assignment.assetId);
    }

    return ok(undefined);
  }

  private validateCompleteDemandLineAssignments(params: {
    demandLines: readonly RentalDemandLine[];
    assignedAssets: readonly AssignedAsset[];
  }): Result<void, RentalCommitmentError> {
    const assignmentCountByDemandLineId = new Map<RentalDemandLineId, number>();

    for (const assignment of params.assignedAssets) {
      const currentCount = assignmentCountByDemandLineId.get(assignment.rentalDemandLineId) ?? 0;
      assignmentCountByDemandLineId.set(assignment.rentalDemandLineId, currentCount + 1);
    }

    for (const demandLine of params.demandLines) {
      const assignmentCount = assignmentCountByDemandLineId.get(demandLine.id) ?? 0;

      if (assignmentCount !== demandLine.quantity) {
        return err(
          new ConfirmedRentalRequiresCompleteAssignmentsError(
            this.id,
            demandLine.id,
            demandLine.quantity,
            assignmentCount,
          ),
        );
      }
    }

    return ok(undefined);
  }

  private validateActiveEquipmentBlocks(params: {
    assignedAssets: readonly AssignedAsset[];
    assetBlocks: readonly AssetBlock[];
    period: RentalPeriod;
  }): Result<void, RentalCommitmentError> {
    const currentAssignmentByAssetId = new Map(
      params.assignedAssets.map((assignment) => [assignment.assetId, assignment]),
    );
    const activeEquipmentBlockCountByAssetId = new Map<AssetId, number>();

    for (const block of params.assetBlocks.filter(
      (block) => block.isActive && block.blockType === AssetBlockType.Equipment,
    )) {
      const assignment = currentAssignmentByAssetId.get(block.assetId);
      if (!assignment) {
        return err(new UnexpectedActiveAssetBlockError(this.id, block.id));
      }

      const requiredPeriod = new RentalPeriod(assignment.effectiveFrom, params.period.end);
      if (!block.period.equals(requiredPeriod)) {
        return err(new AssetBlockPeriodMismatchError(this.id, block.id));
      }

      const currentCount = activeEquipmentBlockCountByAssetId.get(block.assetId) ?? 0;
      activeEquipmentBlockCountByAssetId.set(block.assetId, currentCount + 1);
    }

    for (const assetId of currentAssignmentByAssetId.keys()) {
      const activeBlockCount = activeEquipmentBlockCountByAssetId.get(assetId) ?? 0;

      if (activeBlockCount !== 1) {
        return err(new ConfirmedRentalRequiresActiveBlocksError(this.id, assetId));
      }
    }

    return ok(undefined);
  }

  private static createFromEntities(
    status: RentalStatus,
    props: CreateRentalFromEntitiesProps,
  ): Result<Rental, RentalCommitmentError> {
    const id = props.id ?? (randomUUID() as RentalId);

    const fieldValidation = this.validateRequiredFields(props);
    if (fieldValidation.isErr()) {
      return err(fieldValidation.error);
    }

    const rental = new Rental(id, {
      tenantId: props.tenantId,
      rentalNumber: props.rentalNumber,
      branchId: props.branchId,
      rentalCustomerId: props.rentalCustomerId,
      status,
      period: props.period,
      source: props.source,
      fulfillmentMethod: props.fulfillmentMethod,
      notes: props.notes,
      insuranceSelected: props.insuranceSelected,
      bookingSnapshot: props.bookingSnapshot,
      deliveryDetails: props.deliveryDetails,
      priceSnapshot: props.priceSnapshot,
      confirmedPriceSnapshot: props.confirmedPriceSnapshot,
      selections: [...props.selections],
      demandLines: [...props.demandLines],
      assignedAssets: [...props.assignedAssets],
      assetBlocks: [...props.assetBlocks],
      createdAt: props.createdAt ? new Date(props.createdAt) : undefined,
      version: props.version ?? 0,
      updatedAt: props.updatedAt ? new Date(props.updatedAt) : undefined,
      cancelledAt: props.cancelledAt ? new Date(props.cancelledAt) : undefined,
      confirmedAt: props.confirmedAt ? new Date(props.confirmedAt) : undefined,
    });

    const invariantValidation = rental.validateInvariants();
    if (invariantValidation.isErr()) {
      return err(invariantValidation.error);
    }

    return ok(rental);
  }

  private static createSelections(
    rentalId: RentalId,
    tenantId: string,
    inputs: readonly CreateRentalSelectionInput[],
  ): Result<RentalSelection[], RentalCommitmentError> {
    const selections: RentalSelection[] = [];

    for (const input of inputs) {
      const selection = RentalSelection.create({
        ...input,
        tenantId,
        rentalId,
      });

      if (selection.isErr()) {
        return err(selection.error);
      }

      selections.push(selection.value);
    }

    return ok(selections);
  }

  private static createDemandLines(
    rentalId: RentalId,
    tenantId: string,
    inputs: readonly CreateRentalDemandLineInput[],
  ): Result<RentalDemandLine[], RentalCommitmentError> {
    const demandLines: RentalDemandLine[] = [];

    for (const input of inputs) {
      const demandLine = RentalDemandLine.create({
        ...input,
        tenantId,
        rentalId,
      });

      if (demandLine.isErr()) {
        return err(demandLine.error);
      }

      demandLines.push(demandLine.value);
    }

    return ok(demandLines);
  }

  private static createAssignedAssets(
    rentalId: RentalId,
    tenantId: string,
    effectiveFrom: Date,
    inputs: readonly CreateAssignedAssetInput[],
  ): Result<AssignedAsset[], RentalCommitmentError> {
    const assignedAssets: AssignedAsset[] = [];

    for (const input of inputs) {
      const assignedAsset = AssignedAsset.create({
        ...input,
        tenantId,
        rentalId,
        effectiveFrom,
      });

      if (assignedAsset.isErr()) {
        return err(assignedAsset.error);
      }

      assignedAssets.push(assignedAsset.value);
    }

    return ok(assignedAssets);
  }

  private static createEquipmentBlocksForAssignedAssets(params: {
    tenantId: string;
    rentalId: RentalId;
    period: RentalPeriod;
    assignedAssets: readonly AssignedAsset[];
  }): Result<AssetBlock[], RentalCommitmentError> {
    const assetBlocks: AssetBlock[] = [];

    for (const assignment of params.assignedAssets) {
      const assetBlock = AssetBlock.create({
        tenantId: params.tenantId,
        rentalId: params.rentalId,
        assetId: assignment.assetId,
        period: new RentalPeriod(assignment.effectiveFrom, params.period.end),
        blockType: AssetBlockType.Equipment,
        createdAt: assignment.createdAt,
      });

      if (assetBlock.isErr()) {
        return err(assetBlock.error);
      }

      assetBlocks.push(assetBlock.value);
    }

    return ok(assetBlocks);
  }

  private static validateRequiredFields(
    props: Pick<CreateRentalFromEntitiesProps, 'tenantId' | 'rentalNumber' | 'branchId'>,
  ): Result<void, RentalCommitmentError> {
    for (const [field, value] of [
      ['tenantId', props.tenantId],
      ['branchId', props.branchId],
    ] as const) {
      if (value.trim().length === 0) {
        return err(new RentalInvalidFieldError(field, 'must not be blank'));
      }
    }

    if (!Number.isInteger(props.rentalNumber) || props.rentalNumber <= 0) {
      return err(new RentalInvalidFieldError('rentalNumber', 'must be a positive integer'));
    }

    return ok(undefined);
  }
}

function sameDeliveryDetails(left?: RentalDeliveryDetails, right?: RentalDeliveryDetails): boolean {
  return (
    left?.addressLine1 === right?.addressLine1 &&
    left?.addressLine2 === right?.addressLine2 &&
    left?.city === right?.city &&
    left?.state === right?.state &&
    left?.postalCode === right?.postalCode &&
    left?.country === right?.country &&
    left?.contactName === right?.contactName &&
    left?.contactPhone === right?.contactPhone &&
    left?.notes === right?.notes
  );
}
