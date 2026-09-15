import { err, ok, Result } from 'neverthrow';

import { RentalCommitmentError, RentalInvalidFieldError } from './errors/rental-commitment.errors';
import { RentalDemandLineId } from './ids/rental-demand-line-id';
import { RentalSelectionId } from './ids/rental-selection-id';
import { EquipmentTypeId } from './types/rental-commitment-ids';
import { RentalQuantity } from './value-objects/rental-quantity.value-object';

interface RentalDemandLineProps {
  tenantId: string;
  rentalId: string;
  rentalSelectionId: RentalSelectionId;
  equipmentTypeId: EquipmentTypeId;
  equipmentTypeNameSnapshot: string;
  quantity: RentalQuantity;
  removedQuantity: number;
  createdAt?: Date;
  removedAt?: Date;
}

export interface CreateRentalDemandLineProps {
  id?: RentalDemandLineId;
  tenantId: string;
  rentalId: string;
  rentalSelectionId: RentalSelectionId;
  equipmentTypeId: EquipmentTypeId;
  equipmentTypeNameSnapshot: string;
  quantity: number;
  createdAt?: Date;
}

export interface ReconstituteRentalDemandLineProps extends CreateRentalDemandLineProps {
  id: RentalDemandLineId;
  removedQuantity: number;
  removedAt?: Date;
}

export class RentalDemandLine {
  readonly id: RentalDemandLineId;
  private readonly props: RentalDemandLineProps;

  private constructor(id: RentalDemandLineId, props: RentalDemandLineProps) {
    this.id = id;
    this.props = props;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get rentalId(): string {
    return this.props.rentalId;
  }
  get rentalSelectionId(): RentalSelectionId {
    return this.props.rentalSelectionId;
  }
  get equipmentTypeId(): EquipmentTypeId {
    return this.props.equipmentTypeId;
  }
  get equipmentTypeNameSnapshot(): string {
    return this.props.equipmentTypeNameSnapshot;
  }
  get quantity(): number {
    return this.props.quantity.value;
  }
  get removedQuantity(): number {
    return this.props.removedQuantity;
  }
  get operationalQuantity(): number {
    return this.quantity - this.removedQuantity;
  }
  get createdAt(): Date | undefined {
    return this.props.createdAt ? new Date(this.props.createdAt) : undefined;
  }
  get removedAt(): Date | undefined {
    return this.props.removedAt ? new Date(this.props.removedAt) : undefined;
  }
  get isCurrent(): boolean {
    return this.props.removedAt === undefined;
  }

  changeQuantity(newQuantity: number): Result<RentalDemandLine, RentalCommitmentError> {
    const quantity = RentalQuantity.create(newQuantity);
    if (quantity.isErr()) {
      return err(quantity.error);
    }
    if (newQuantity < this.removedQuantity) {
      return err(new RentalInvalidFieldError('quantity', 'must not be lower than removedQuantity'));
    }
    if (this.isCurrent && this.removedQuantity > 0 && newQuantity === this.removedQuantity) {
      return err(new RentalInvalidFieldError('quantity', 'must be greater than removedQuantity for a current line'));
    }

    return ok(
      new RentalDemandLine(this.id, {
        ...this.props,
        quantity: quantity.value,
        removedQuantity: this.removedAt ? newQuantity : this.removedQuantity,
      }),
    );
  }

  removeAt(operationTime: Date): RentalDemandLine {
    return new RentalDemandLine(this.id, {
      ...this.props,
      removedQuantity: this.quantity,
      removedAt: this.props.removedAt ?? new Date(operationTime),
    });
  }

  restore(): RentalDemandLine {
    return new RentalDemandLine(this.id, {
      ...this.props,
      removedQuantity: 0,
      removedAt: undefined,
    });
  }

  static create(props: CreateRentalDemandLineProps): Result<RentalDemandLine, RentalCommitmentError> {
    const validation = this.validatePrimitiveFields(props);
    if (validation.isErr()) {
      return err(validation.error);
    }

    const quantity = RentalQuantity.create(props.quantity);
    if (quantity.isErr()) {
      return err(quantity.error);
    }

    return ok(
      new RentalDemandLine(props.id ?? RentalDemandLineId.create(), {
        ...props,
        quantity: quantity.value,
        removedQuantity: 0,
        createdAt: props.createdAt ? new Date(props.createdAt) : undefined,
        removedAt: undefined,
      }),
    );
  }

  static reconstitute(props: ReconstituteRentalDemandLineProps): RentalDemandLine {
    const quantity = RentalQuantity.reconstitute(props.quantity);
    this.assertRemovalState(props.removedQuantity, quantity.value, props.removedAt);

    return new RentalDemandLine(props.id, {
      ...props,
      quantity,
      createdAt: props.createdAt ? new Date(props.createdAt) : undefined,
      removedAt: props.removedAt ? new Date(props.removedAt) : undefined,
    });
  }

  private static assertRemovalState(removedQuantity: number, quantity: number, removedAt?: Date): void {
    if (!Number.isInteger(removedQuantity)) {
      throw new RentalInvalidFieldError('removedQuantity', 'must be an integer');
    }
    if (removedQuantity < 0) {
      throw new RentalInvalidFieldError('removedQuantity', 'must be greater than or equal to zero');
    }
    if (removedQuantity > quantity) {
      throw new RentalInvalidFieldError('removedQuantity', 'must not exceed quantity');
    }
    if (removedQuantity === quantity && removedAt === undefined) {
      throw new RentalInvalidFieldError('removedAt', 'must be set when the full quantity is removed');
    }
    if (removedQuantity < quantity && removedAt !== undefined) {
      throw new RentalInvalidFieldError('removedAt', 'must be absent unless the full quantity is removed');
    }
  }

  private static validatePrimitiveFields(
    props: Pick<
      CreateRentalDemandLineProps,
      'tenantId' | 'rentalId' | 'rentalSelectionId' | 'equipmentTypeId' | 'equipmentTypeNameSnapshot'
    >,
  ): Result<void, RentalCommitmentError> {
    for (const [field, value] of [
      ['tenantId', props.tenantId],
      ['rentalId', props.rentalId],
      ['rentalSelectionId', props.rentalSelectionId],
      ['equipmentTypeId', props.equipmentTypeId],
      ['equipmentTypeNameSnapshot', props.equipmentTypeNameSnapshot],
    ] as const) {
      if (value.trim().length === 0) {
        return err(new RentalInvalidFieldError(field, 'must not be blank'));
      }
    }

    return ok(undefined);
  }
}
