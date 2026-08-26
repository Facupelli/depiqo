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
  removedAt?: Date;
}

export interface ReconstituteRentalDemandLineProps extends Omit<CreateRentalDemandLineProps, 'id'> {
  id: RentalDemandLineId;
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

    return ok(
      new RentalDemandLine(this.id, {
        ...this.props,
        quantity: quantity.value,
      }),
    );
  }

  removeAt(operationTime: Date): RentalDemandLine {
    return new RentalDemandLine(this.id, {
      ...this.props,
      removedAt: this.props.removedAt ?? new Date(operationTime),
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
        createdAt: props.createdAt ? new Date(props.createdAt) : undefined,
        removedAt: props.removedAt ? new Date(props.removedAt) : undefined,
      }),
    );
  }

  static reconstitute(props: ReconstituteRentalDemandLineProps): RentalDemandLine {
    return new RentalDemandLine(props.id, {
      ...props,
      quantity: RentalQuantity.reconstitute(props.quantity),
      createdAt: props.createdAt ? new Date(props.createdAt) : undefined,
      removedAt: props.removedAt ? new Date(props.removedAt) : undefined,
    });
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
