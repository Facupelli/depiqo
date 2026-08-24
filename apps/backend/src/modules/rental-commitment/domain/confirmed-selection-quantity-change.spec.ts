import { RentalInvalidFieldError } from './errors/rental-commitment.errors';
import { RentalDemandLineId } from './ids/rental-demand-line-id';
import { deriveConfirmedSelectionQuantityChange } from './confirmed-selection-quantity-change';

describe('ConfirmedSelectionQuantityChange', () => {
  const cameraDemandId = 'camera-demand' as RentalDemandLineId;
  const tripodDemandId = 'tripod-demand' as RentalDemandLineId;
  const demandLines = [
    { id: cameraDemandId, quantity: 4 },
    { id: tripodDemandId, quantity: 2 },
  ];

  it('derives next demand and positive per-line deltas for increases and decreases', () => {
    const increase = deriveConfirmedSelectionQuantityChange({
      currentSelectionQuantity: 2,
      requestedSelectionQuantity: 3,
      demandLines,
    })._unsafeUnwrap();
    const decrease = deriveConfirmedSelectionQuantityChange({
      currentSelectionQuantity: 2,
      requestedSelectionQuantity: 1,
      demandLines,
    })._unsafeUnwrap();

    expect(increase.direction).toBe('INCREASE');
    expect(increase.nextQuantityFor(cameraDemandId)).toBe(6);
    expect(increase.deltaFor(cameraDemandId)).toBe(2);
    expect(increase.nextQuantityFor(tripodDemandId)).toBe(3);
    expect(increase.deltaFor(tripodDemandId)).toBe(1);
    expect(decrease.direction).toBe('DECREASE');
    expect(decrease.nextQuantityFor(cameraDemandId)).toBe(2);
    expect(decrease.deltaFor(cameraDemandId)).toBe(2);
    expect(decrease.nextQuantityFor(tripodDemandId)).toBe(1);
    expect(decrease.deltaFor(tripodDemandId)).toBe(1);
  });

  it('fails closed when persisted demand is not divisible by selection quantity', () => {
    const result = deriveConfirmedSelectionQuantityChange({
      currentSelectionQuantity: 2,
      requestedSelectionQuantity: 3,
      demandLines: [{ id: cameraDemandId, quantity: 3 }],
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toEqual(
      new RentalInvalidFieldError('demandLines', 'persisted demand is not divisible by selection quantity'),
    );
  });
});
