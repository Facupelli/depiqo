import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { AggregateRootBase } from 'src/core/domain/aggregate-root.base';
import { isValidBufferMinutes } from 'src/core/domain/rental-asset-buffer';

import { AssetBlock } from './asset-block.entity';
import { deriveBufferedAssetBlockPeriod } from './asset-block-period';
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
import { deriveConfirmedSelectionQuantityChange } from './confirmed-selection-quantity-change';
import { deriveConfirmationParticipationTiming } from './confirmation-participation-timing';
import { AssetId, RentalId } from './types/rental-commitment-ids';
import { CreateRentalDemandLineProps, RentalDemandLine } from './rental-demand-line.entity';
import { AssetBlockType, FulfillmentMethod, RentalSource, RentalStatus } from './rental-status';
import { CreateRentalSelectionProps, RentalSelection } from './rental-selection.entity';
import { endAssignmentParticipation } from './release-assignment-participation';
import { AssignedAssetOwnershipSnapshot } from './value-objects/assigned-asset-ownership-snapshot.value-object';
import { ConfirmedPriceSnapshot } from './value-objects/confirmed-price-snapshot.value-object';
import { BookingSnapshot, JsonSnapshot, JsonValue } from './value-objects/json-snapshot.value-object';
import { RentalPeriod } from './value-objects/rental-period.value-object';
import {
  ConfirmedRentalEditedDomainEvent,
  RentalCancelledDomainEvent,
  RentalConfirmedDomainEvent,
} from './events/rental-lifecycle.domain-events';

export interface AcceptedRentalAssetBuffer {
  beforeBufferMinutes: number;
  afterBufferMinutes: number;
}

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
  fulfillmentMethod: FulfillmentMethod;
  notes?: string;
  insuranceSelected?: boolean;
  bookingSnapshot?: BookingSnapshot;
  deliveryDetails?: RentalDeliveryDetails;
  priceSnapshot?: JsonSnapshot;
  confirmedPriceSnapshot?: ConfirmedPriceSnapshot;
  acceptedAssetBuffer?: AcceptedRentalAssetBuffer;
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

export interface CreateRentalBaseProps {
  id?: RentalId;
  tenantId: string;
  rentalNumber: number;
  branchId: string;
  rentalCustomerId?: string;
  period: RentalPeriod;
  source?: RentalSource;
  fulfillmentMethod: FulfillmentMethod;
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
  confirmedAt?: Date;
  confirmedPriceSnapshot: JsonValue;
  acceptedAssetBuffer: AcceptedRentalAssetBuffer;
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
  fulfillmentMethod: FulfillmentMethod;
  notes?: string;
  insuranceSelected?: boolean;
  bookingSnapshot?: BookingSnapshot;
  deliveryDetails?: RentalDeliveryDetails;
  priceSnapshot?: JsonValue;
  confirmedPriceSnapshot?: JsonValue;
  acceptedAssetBuffer?: AcceptedRentalAssetBuffer;
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

interface ConfirmedRentalStateChanges {
  period?: RentalPeriod;
  fulfillmentMethod?: FulfillmentMethod;
  notes?: string;
  insuranceSelected?: boolean;
  deliveryDetails?: RentalDeliveryDetails;
  confirmedPriceSnapshot?: ConfirmedPriceSnapshot;
  selections?: RentalSelection[];
  demandLines?: RentalDemandLine[];
  assignedAssets?: AssignedAsset[];
  assetBlocks?: AssetBlock[];
}

interface CreateRentalFromEntitiesProps {
  id?: RentalId;
  tenantId: string;
  rentalNumber: number;
  branchId: string;
  rentalCustomerId?: string;
  period: RentalPeriod;
  source?: RentalSource;
  fulfillmentMethod: FulfillmentMethod;
  notes?: string;
  insuranceSelected?: boolean;
  bookingSnapshot?: BookingSnapshot;
  deliveryDetails?: RentalDeliveryDetails;
  priceSnapshot?: JsonSnapshot;
  confirmedPriceSnapshot?: ConfirmedPriceSnapshot;
  acceptedAssetBuffer?: AcceptedRentalAssetBuffer;
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

  get fulfillmentMethod(): FulfillmentMethod {
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

  get acceptedAssetBuffer(): AcceptedRentalAssetBuffer | undefined {
    return this.props.acceptedAssetBuffer ? { ...this.props.acceptedAssetBuffer } : undefined;
  }

  requireAcceptedAssetBuffer(): AcceptedRentalAssetBuffer {
    if (!this.props.acceptedAssetBuffer) {
      throw new RentalInvalidFieldError('acceptedAssetBuffer', 'confirmed rentals require an accepted buffer');
    }
    return { ...this.props.acceptedAssetBuffer };
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
    const acceptedAssetBufferValidation = this.validateAcceptedAssetBuffer(props.acceptedAssetBuffer);
    if (acceptedAssetBufferValidation.isErr()) {
      return err(acceptedAssetBufferValidation.error);
    }

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

    const confirmedAt = props.confirmedAt ? new Date(props.confirmedAt) : new Date();
    const participationTiming = deriveConfirmationParticipationTiming(props.period, confirmedAt);
    const assignedAssets = this.createAssignedAssets(
      rentalId,
      props.tenantId,
      participationTiming.participationPeriod.start,
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
          period: participationTiming.participationPeriod,
          acceptedAssetBuffer: props.acceptedAssetBuffer,
          assignedAssets: assignedAssets.value,
          operationTime: participationTiming.blockOperationTime,
        });

    if (assetBlocks.isErr()) {
      return err(assetBlocks.error);
    }

    const rental = this.createFromEntities(RentalStatus.Confirmed, {
      ...props,
      id: rentalId,
      confirmedPriceSnapshot: confirmedPriceSnapshot.value,
      acceptedAssetBuffer: props.acceptedAssetBuffer,
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
      acceptedAssetBuffer: props.acceptedAssetBuffer,
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

    const transition = this.applyConfirmedStateChanges({
      fulfillmentMethod: params.fulfillmentMethod,
      notes: params.notes,
      insuranceSelected: params.insuranceSelected,
      deliveryDetails: params.deliveryDetails,
      confirmedPriceSnapshot: confirmedPriceSnapshot.value,
    });
    if (transition.isErr()) return err(transition.error);

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
    const acceptedAssetBuffer = this.requireAcceptedAssetBuffer();

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
      acceptedAssetBuffer,
      assignedAssets: assignedAssets.value,
      operationTime: params.operationTime,
    });
    if (assetBlocks.isErr()) return err(assetBlocks.error);

    const confirmedPriceSnapshot = ConfirmedPriceSnapshot.create(params.confirmedPriceSnapshot);
    if (confirmedPriceSnapshot.isErr()) return err(confirmedPriceSnapshot.error);

    const transition = this.applyConfirmedStateChanges({
      confirmedPriceSnapshot: confirmedPriceSnapshot.value,
      selections: [...this.props.selections, selection.value],
      demandLines: [...this.props.demandLines, ...demandLines.value],
      assignedAssets: [...this.props.assignedAssets, ...assignedAssets.value],
      assetBlocks: [...this.props.assetBlocks, ...assetBlocks.value],
    });
    if (transition.isErr()) return err(transition.error);

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
    const acceptedAssetBuffer = this.requireAcceptedAssetBuffer();

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
      const releasedParticipation = endAssignmentParticipation({
        assignment,
        block,
        effectiveAt,
        rentalStart: this.period.start,
        acceptedAssetBuffer,
      });
      if (releasedParticipation.isErr()) return err(releasedParticipation.error);

      const { assignment: releasedAssignment, block: releasedBlock } = releasedParticipation.value;
      nextAssignedAssets = releasedAssignment
        ? nextAssignedAssets.map((candidate) => (candidate.id === assignment.id ? releasedAssignment : candidate))
        : nextAssignedAssets.filter((candidate) => candidate.id !== assignment.id);
      nextAssetBlocks = releasedBlock
        ? nextAssetBlocks.map((candidate) => (candidate.id === block.id ? releasedBlock : candidate))
        : nextAssetBlocks.filter((candidate) => candidate.id !== block.id);
    }

    const price = ConfirmedPriceSnapshot.create(params.confirmedPriceSnapshot);
    if (price.isErr()) return err(price.error);
    const transition = this.applyConfirmedStateChanges({
      confirmedPriceSnapshot: price.value,
      selections: this.props.selections.map((item) => (item.id === selection.id ? removedSelection : item)),
      demandLines: nextDemandLines,
      assignedAssets: nextAssignedAssets,
      assetBlocks: nextAssetBlocks,
    });
    if (transition.isErr()) return err(transition.error);
    this.recordConfirmedRentalEditedEvent(params.operationTime);
    return ok(undefined);
  }

  changeConfirmedSelectionQuantity(params: ChangeConfirmedSelectionQuantityProps): Result<void, RentalCommitmentError> {
    if (this.status !== RentalStatus.Confirmed)
      return err(new RentalCannotBeEditedFromStatusError(this.id, this.status));
    const acceptedAssetBuffer = this.requireAcceptedAssetBuffer();
    const selection = this.currentSelections.find((candidate) => candidate.id === params.selectionId);
    if (!selection) return err(new RentalSelectionNotFoundError(this.id, params.selectionId));
    const effectiveAt = params.operationTime < this.period.start ? this.period.start : params.operationTime;
    if (effectiveAt >= this.period.end) return err(new RentalPeriodHasEndedError(this.id));
    const targetDemandLines = this.currentDemandLines.filter((line) => line.rentalSelectionId === selection.id);
    if (targetDemandLines.length === 0) {
      return err(new RentalInvalidFieldError('demandLines', 'target selection must have persisted demand'));
    }
    const quantityChange = deriveConfirmedSelectionQuantityChange({
      currentSelectionQuantity: selection.quantity,
      requestedSelectionQuantity: params.newQuantity,
      demandLines: targetDemandLines,
    });
    if (quantityChange.isErr()) return err(quantityChange.error);

    const increasing = quantityChange.value.direction === 'INCREASE';
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
        if ((releaseCountByDemandId.get(line.id) ?? 0) !== quantityChange.value.deltaFor(line.id))
          return err(
            new RentalInvalidFieldError('releaseAssetIds', 'release distribution must exactly match demand reduction'),
          );
      }
    }

    const nextSelection = selection.changeQuantity(params.newQuantity);
    if (nextSelection.isErr()) return err(nextSelection.error);
    const nextDemandLines: RentalDemandLine[] = [];
    for (const line of this.props.demandLines) {
      const quantity = quantityChange.value.nextQuantityFor(line.id);
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
        acceptedAssetBuffer,
        assignedAssets: additions.value,
        operationTime: params.operationTime,
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
        const releasedParticipation = endAssignmentParticipation({
          assignment,
          block: currentBlock,
          effectiveAt,
          rentalStart: this.period.start,
          acceptedAssetBuffer,
        });
        if (releasedParticipation.isErr()) return err(releasedParticipation.error);

        const { assignment: releasedAssignment, block: releasedBlock } = releasedParticipation.value;
        nextAssignedAssets = releasedAssignment
          ? nextAssignedAssets.map((candidate) => (candidate.id === assignment.id ? releasedAssignment : candidate))
          : nextAssignedAssets.filter((candidate) => candidate.id !== assignment.id);
        nextAssetBlocks = releasedBlock
          ? nextAssetBlocks.map((candidate) => (candidate.id === currentBlock.id ? releasedBlock : candidate))
          : nextAssetBlocks.filter((candidate) => candidate.id !== currentBlock.id);
      }
    }

    const price = ConfirmedPriceSnapshot.create(params.confirmedPriceSnapshot);
    if (price.isErr()) return err(price.error);
    const transition = this.applyConfirmedStateChanges({
      confirmedPriceSnapshot: price.value,
      selections: this.props.selections.map((candidate) =>
        candidate.id === selection.id ? nextSelection.value : candidate,
      ),
      demandLines: nextDemandLines,
      assignedAssets: nextAssignedAssets,
      assetBlocks: nextAssetBlocks,
    });
    if (transition.isErr()) return err(transition.error);
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
    const acceptedAssetBuffer = this.requireAcceptedAssetBuffer();

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
      period: deriveBufferedAssetBlockPeriod({
        participationPeriod: new RentalPeriod(effectiveAt, this.period.end),
        beforeBufferMinutes: acceptedAssetBuffer.beforeBufferMinutes,
        afterBufferMinutes: acceptedAssetBuffer.afterBufferMinutes,
        clampStartAt: params.operationTime,
      }),
      blockType: AssetBlockType.Equipment,
      createdAt: params.operationTime,
    });
    if (replacementBlock.isErr()) return err(replacementBlock.error);

    const currentBlock = this.props.assetBlocks.find(
      (block) =>
        block.isActive &&
        block.blockType === AssetBlockType.Equipment &&
        block.assetId === params.currentAssignedAssetId,
    );
    if (!currentBlock) {
      return err(new ConfirmedRentalRequiresActiveBlocksError(this.id, params.currentAssignedAssetId));
    }

    const releasedParticipation = endAssignmentParticipation({
      assignment: currentAssignment,
      block: currentBlock,
      effectiveAt,
      rentalStart: this.period.start,
      acceptedAssetBuffer,
    });
    if (releasedParticipation.isErr()) return err(releasedParticipation.error);

    const nextAssignedAssets = [
      ...this.props.assignedAssets.filter((assignment) => assignment.id !== currentAssignment.id),
      ...(releasedParticipation.value.assignment ? [releasedParticipation.value.assignment] : []),
      replacementAssignment.value,
    ];
    const nextAssetBlocks = [
      ...this.props.assetBlocks.filter((block) => block.id !== currentBlock.id),
      ...(releasedParticipation.value.block ? [releasedParticipation.value.block] : []),
      replacementBlock.value,
    ];

    const transition = this.applyConfirmedStateChanges({
      assignedAssets: nextAssignedAssets,
      assetBlocks: nextAssetBlocks,
    });
    if (transition.isErr()) return err(transition.error);

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
    acceptedAssetBuffer: AcceptedRentalAssetBuffer;
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

    const confirmedAt = params.confirmedAt ? new Date(params.confirmedAt) : new Date();
    const participationTiming = deriveConfirmationParticipationTiming(this.period, confirmedAt);
    const assignedAssets = Rental.createAssignedAssets(
      this.id,
      this.tenantId,
      participationTiming.participationPeriod.start,
      params.assignedAssets,
    );

    if (assignedAssets.isErr()) {
      return err(assignedAssets.error);
    }

    const acceptedAssetBufferValidation = Rental.validateAcceptedAssetBuffer(params.acceptedAssetBuffer);
    if (acceptedAssetBufferValidation.isErr()) {
      return err(acceptedAssetBufferValidation.error);
    }

    const assetBlocks = this.resolveConfirmationAssetBlocks({
      assignedAssets: assignedAssets.value,
      acceptedAssetBuffer: params.acceptedAssetBuffer,
      assetBlocks: params.assetBlocks,
      participationPeriod: participationTiming.participationPeriod,
      operationTime: participationTiming.blockOperationTime,
    });

    if (assetBlocks.isErr()) {
      return err(assetBlocks.error);
    }

    const confirmedStateValidation = this.validateConfirmedState({
      confirmedPriceSnapshot: confirmedPriceSnapshot.value,
      demandLines: this.props.demandLines,
      assignedAssets: assignedAssets.value,
      assetBlocks: assetBlocks.value,
      acceptedAssetBuffer: params.acceptedAssetBuffer,
      period: this.period,
    });

    if (confirmedStateValidation.isErr()) {
      return err(confirmedStateValidation.error);
    }

    this.props.status = RentalStatus.Confirmed;
    this.props.confirmedPriceSnapshot = confirmedPriceSnapshot.value;
    this.props.acceptedAssetBuffer = { ...params.acceptedAssetBuffer };
    this.props.assignedAssets = assignedAssets.value;
    this.props.assetBlocks = assetBlocks.value;
    this.props.confirmedAt = confirmedAt;
    this.recordRentalConfirmedEvent(confirmedAt);

    return ok(undefined);
  }

  private applyConfirmedStateChanges(changes: ConfirmedRentalStateChanges): Result<void, RentalCommitmentError> {
    const candidate = Rental.createFromEntities(this.status, {
      ...this.props,
      ...changes,
      id: this.id,
    });

    if (candidate.isErr()) {
      return err(candidate.error);
    }

    this.props = candidate.value.props;

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
        this.fulfillmentMethod,
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
        this.fulfillmentMethod,
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
    acceptedAssetBuffer: AcceptedRentalAssetBuffer;
    assetBlocks?: readonly AssetBlock[];
    participationPeriod: RentalPeriod;
    operationTime?: Date;
  }): Result<AssetBlock[], RentalCommitmentError> {
    if (params.assetBlocks) {
      return ok([...params.assetBlocks]);
    }

    return Rental.createEquipmentBlocksForAssignedAssets({
      tenantId: this.tenantId,
      rentalId: this.id,
      period: params.participationPeriod,
      acceptedAssetBuffer: params.acceptedAssetBuffer,
      assignedAssets: params.assignedAssets,
      operationTime: params.operationTime,
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
    if (!this.props.acceptedAssetBuffer) {
      return err(new RentalInvalidFieldError('acceptedAssetBuffer', 'confirmed rentals require an accepted buffer'));
    }

    return this.validateConfirmedState({
      confirmedPriceSnapshot: this.props.confirmedPriceSnapshot,
      demandLines: this.currentDemandLines,
      assignedAssets: this.props.assignedAssets,
      assetBlocks: this.props.assetBlocks,
      acceptedAssetBuffer: this.props.acceptedAssetBuffer,
      period: this.period,
    });
  }

  private validateConfirmedState(params: {
    confirmedPriceSnapshot?: ConfirmedPriceSnapshot;
    demandLines: readonly RentalDemandLine[];
    assignedAssets: readonly AssignedAsset[];
    assetBlocks: readonly AssetBlock[];
    acceptedAssetBuffer: AcceptedRentalAssetBuffer;
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
      assignedAssets: params.assignedAssets,
      assetBlocks: params.assetBlocks,
      acceptedAssetBuffer: params.acceptedAssetBuffer,
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
    acceptedAssetBuffer: AcceptedRentalAssetBuffer;
    period: RentalPeriod;
  }): Result<void, RentalCommitmentError> {
    const equipmentBlocks = params.assetBlocks.filter((block) => block.blockType === AssetBlockType.Equipment);
    const matchedBlockIds = new Set<string>();
    const orderedAssignments = [
      ...params.assignedAssets.filter((assignment) => assignment.isActive),
      ...params.assignedAssets.filter((assignment) => !assignment.isActive),
    ];

    for (const assignment of orderedAssignments) {
      const participationEnd = assignment.effectiveUntil ?? params.period.end;
      const expectedPeriod = deriveBufferedAssetBlockPeriod({
        participationPeriod: new RentalPeriod(assignment.effectiveFrom, participationEnd),
        beforeBufferMinutes: params.acceptedAssetBuffer.beforeBufferMinutes,
        afterBufferMinutes: params.acceptedAssetBuffer.afterBufferMinutes,
        ...(assignment.effectiveFrom > params.period.start ? { clampStartAt: assignment.effectiveFrom } : {}),
      });
      const block = equipmentBlocks.find((candidate) => {
        if (matchedBlockIds.has(candidate.id) || candidate.assetId !== assignment.assetId) return false;
        if (assignment.isActive) return candidate.isActive && candidate.period.equals(expectedPeriod);
        if (candidate.isActive) return candidate.period.equals(expectedPeriod);

        return (
          candidate.period.start.getTime() === expectedPeriod.start.getTime() &&
          candidate.period.end <= expectedPeriod.end &&
          candidate.period.end >= assignment.effectiveUntil!
        );
      });

      if (!block) {
        return err(
          assignment.isActive
            ? new ConfirmedRentalRequiresActiveBlocksError(this.id, assignment.assetId)
            : new AssetBlockPeriodMismatchError(this.id, assignment.assetId),
        );
      }
      matchedBlockIds.add(block.id);
    }

    const unmatchedBlock = equipmentBlocks.find((block) => !matchedBlockIds.has(block.id));
    if (unmatchedBlock) return err(new UnexpectedActiveAssetBlockError(this.id, unmatchedBlock.id));

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
      acceptedAssetBuffer: props.acceptedAssetBuffer ? { ...props.acceptedAssetBuffer } : undefined,
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

    if (rental.props.acceptedAssetBuffer) {
      const bufferValidation = this.validateAcceptedAssetBuffer(rental.props.acceptedAssetBuffer);
      if (bufferValidation.isErr()) {
        return err(bufferValidation.error);
      }
    }

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
    acceptedAssetBuffer: AcceptedRentalAssetBuffer;
    assignedAssets: readonly AssignedAsset[];
    operationTime?: Date;
  }): Result<AssetBlock[], RentalCommitmentError> {
    const assetBlocks: AssetBlock[] = [];

    for (const assignment of params.assignedAssets) {
      const assetBlock = AssetBlock.create({
        tenantId: params.tenantId,
        rentalId: params.rentalId,
        assetId: assignment.assetId,
        period: deriveBufferedAssetBlockPeriod({
          participationPeriod: new RentalPeriod(assignment.effectiveFrom, params.period.end),
          beforeBufferMinutes: params.acceptedAssetBuffer.beforeBufferMinutes,
          afterBufferMinutes: params.acceptedAssetBuffer.afterBufferMinutes,
          clampStartAt: params.operationTime,
        }),
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

  private static validateAcceptedAssetBuffer(buffer: AcceptedRentalAssetBuffer): Result<void, RentalCommitmentError> {
    for (const [field, value] of [
      ['beforeBufferMinutes', buffer.beforeBufferMinutes],
      ['afterBufferMinutes', buffer.afterBufferMinutes],
    ] as const) {
      if (!isValidBufferMinutes(value)) {
        return err(new RentalInvalidFieldError(field, 'must be a non-negative integer'));
      }
    }

    return ok(undefined);
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
