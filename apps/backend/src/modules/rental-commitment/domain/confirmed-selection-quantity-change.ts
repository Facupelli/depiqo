import { err, ok, Result } from 'neverthrow';

import { RentalInvalidFieldError } from './errors/rental-commitment.errors';
import { RentalDemandLineId } from './ids/rental-demand-line-id';

export type ConfirmedSelectionQuantityChangeDirection = 'INCREASE' | 'DECREASE';

interface DemandLineQuantity {
  readonly id: RentalDemandLineId;
  readonly quantity: number;
}

export interface DeriveConfirmedSelectionQuantityChangeProps {
  readonly currentSelectionQuantity: number;
  readonly requestedSelectionQuantity: number;
  readonly demandLines: readonly DemandLineQuantity[];
}

interface DemandLineQuantityChange {
  readonly demandLineId: RentalDemandLineId;
  readonly nextQuantity: number;
  readonly delta: number;
}

export class ConfirmedSelectionQuantityChange {
  readonly direction: ConfirmedSelectionQuantityChangeDirection;
  private readonly changesByDemandLineId: ReadonlyMap<RentalDemandLineId, DemandLineQuantityChange>;

  constructor(direction: ConfirmedSelectionQuantityChangeDirection, changes: readonly DemandLineQuantityChange[]) {
    this.direction = direction;
    this.changesByDemandLineId = new Map(changes.map((change) => [change.demandLineId, Object.freeze({ ...change })]));
  }

  nextQuantityFor(demandLineId: RentalDemandLineId): number | undefined {
    return this.changesByDemandLineId.get(demandLineId)?.nextQuantity;
  }

  deltaFor(demandLineId: RentalDemandLineId): number | undefined {
    return this.changesByDemandLineId.get(demandLineId)?.delta;
  }
}

export function deriveConfirmedSelectionQuantityChange(
  props: DeriveConfirmedSelectionQuantityChangeProps,
): Result<ConfirmedSelectionQuantityChange, RentalInvalidFieldError> {
  if (!Number.isInteger(props.requestedSelectionQuantity) || props.requestedSelectionQuantity <= 0) {
    return err(new RentalInvalidFieldError('quantity', 'must be a positive integer'));
  }
  if (props.requestedSelectionQuantity === props.currentSelectionQuantity) {
    return err(new RentalInvalidFieldError('quantity', 'must differ from the current quantity'));
  }

  const direction: ConfirmedSelectionQuantityChangeDirection =
    props.requestedSelectionQuantity > props.currentSelectionQuantity ? 'INCREASE' : 'DECREASE';
  const changes: DemandLineQuantityChange[] = [];

  for (const line of props.demandLines) {
    if (
      props.currentSelectionQuantity <= 0 ||
      line.quantity <= 0 ||
      line.quantity % props.currentSelectionQuantity !== 0
    ) {
      return err(new RentalInvalidFieldError('demandLines', 'persisted demand is not divisible by selection quantity'));
    }

    const quantityPerItem = line.quantity / props.currentSelectionQuantity;
    if (!Number.isInteger(quantityPerItem) || quantityPerItem <= 0) {
      return err(new RentalInvalidFieldError('demandLines', 'derived quantity-per-item must be a positive integer'));
    }

    const nextQuantity = props.requestedSelectionQuantity * quantityPerItem;
    const delta = direction === 'INCREASE' ? nextQuantity - line.quantity : line.quantity - nextQuantity;
    changes.push({ demandLineId: line.id, nextQuantity, delta });
  }

  return ok(new ConfirmedSelectionQuantityChange(direction, changes));
}
