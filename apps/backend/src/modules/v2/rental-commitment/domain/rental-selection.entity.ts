import { err, ok, Result } from 'neverthrow';

import {
  DuplicateRentalOfferSelectionError,
  RentalCommitmentError,
  RentalInvalidFieldError,
} from './errors/rental-commitment.errors';
import { RentalSelectionId } from './ids/rental-selection-id';
import { JsonSnapshot, JsonValue } from './value-objects/json-snapshot.value-object';
import { RentalQuantity } from './value-objects/rental-quantity.value-object';
import { RentableItemKind, RENTABLE_ITEM_KINDS } from '../../catalog/domain/rentable-item.aggregate';

interface RentalSelectionProps {
  tenantId: string;
  rentalId: string;
  rentalOfferId: string;
  rentableItemId: string;
  rentableItemNameSnapshot: string;
  rentableItemKindSnapshot: RentableItemKind;
  quantity: RentalQuantity;
  priceSnapshot?: JsonSnapshot;
  createdAt?: Date;
}

export interface CreateRentalSelectionProps {
  id?: RentalSelectionId;
  tenantId: string;
  rentalId: string;
  rentalOfferId: string;
  rentableItemId: string;
  rentableItemNameSnapshot: string;
  rentableItemKindSnapshot: RentableItemKind;
  quantity: number;
  priceSnapshot?: JsonValue;
  createdAt?: Date;
}

export interface ReconstituteRentalSelectionProps extends Omit<CreateRentalSelectionProps, 'id'> {
  id: RentalSelectionId;
}

export class RentalSelection {
  readonly id: RentalSelectionId;
  private readonly props: RentalSelectionProps;

  private constructor(id: RentalSelectionId, props: RentalSelectionProps) {
    this.id = id;
    this.props = props;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get rentalId(): string {
    return this.props.rentalId;
  }
  get rentalOfferId(): string {
    return this.props.rentalOfferId;
  }
  get rentableItemId(): string {
    return this.props.rentableItemId;
  }
  get rentableItemNameSnapshot(): string {
    return this.props.rentableItemNameSnapshot;
  }
  get rentableItemKindSnapshot(): RentableItemKind {
    return this.props.rentableItemKindSnapshot;
  }
  get quantity(): number {
    return this.props.quantity.value;
  }
  get priceSnapshot(): JsonSnapshot | undefined {
    return this.props.priceSnapshot;
  }
  get createdAt(): Date | undefined {
    return this.props.createdAt ? new Date(this.props.createdAt) : undefined;
  }
  hasSameRentalOffer(other: RentalSelection): boolean {
    return this.rentalOfferId === other.rentalOfferId;
  }

  static create(props: CreateRentalSelectionProps): Result<RentalSelection, RentalCommitmentError> {
    const validation = this.validatePrimitiveFields(props);
    if (validation.isErr()) {
      return err(validation.error);
    }

    const quantity = RentalQuantity.create(props.quantity);
    if (quantity.isErr()) {
      return err(quantity.error);
    }

    return ok(
      new RentalSelection(props.id ?? RentalSelectionId.create(), {
        ...props,
        quantity: quantity.value,
        priceSnapshot: props.priceSnapshot === undefined ? undefined : new JsonSnapshot(props.priceSnapshot),
        createdAt: props.createdAt ? new Date(props.createdAt) : undefined,
      }),
    );
  }

  static reconstitute(props: ReconstituteRentalSelectionProps): RentalSelection {
    return new RentalSelection(props.id, {
      ...props,
      quantity: RentalQuantity.reconstitute(props.quantity),
      priceSnapshot: props.priceSnapshot === undefined ? undefined : new JsonSnapshot(props.priceSnapshot),
      createdAt: props.createdAt ? new Date(props.createdAt) : undefined,
    });
  }

  static ensureNoDuplicateOffers(selections: readonly RentalSelection[]): Result<void, RentalCommitmentError> {
    const seen = new Set<string>();
    for (const selection of selections) {
      if (seen.has(selection.rentalOfferId)) {
        return err(new DuplicateRentalOfferSelectionError(selection.rentalOfferId));
      }
      seen.add(selection.rentalOfferId);
    }
    return ok(undefined);
  }

  private static validatePrimitiveFields(
    props: Pick<
      CreateRentalSelectionProps,
      | 'tenantId'
      | 'rentalId'
      | 'rentalOfferId'
      | 'rentableItemId'
      | 'rentableItemNameSnapshot'
      | 'rentableItemKindSnapshot'
    >,
  ): Result<void, RentalCommitmentError> {
    for (const [field, value] of [
      ['tenantId', props.tenantId],
      ['rentalId', props.rentalId],
      ['rentalOfferId', props.rentalOfferId],
      ['rentableItemId', props.rentableItemId],
      ['rentableItemNameSnapshot', props.rentableItemNameSnapshot],
    ] as const) {
      if (value.trim().length === 0) {
        return err(new RentalInvalidFieldError(field, 'must not be blank'));
      }
    }

    if (!Object.values(RENTABLE_ITEM_KINDS).includes(props.rentableItemKindSnapshot)) {
      return err(new RentalInvalidFieldError('rentableItemKindSnapshot', 'must be a valid rentable item kind'));
    }

    return ok(undefined);
  }
}
