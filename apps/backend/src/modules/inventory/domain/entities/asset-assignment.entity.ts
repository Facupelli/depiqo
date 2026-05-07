import { randomUUID } from 'crypto';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { AssignmentSource, AssignmentType, OrderAssignmentStage } from '@repo/types';
import { InvalidAssetAssignmentException } from '../exceptions/asset.exception';

export interface CreateAssetAssignmentProps {
  assetId: string;
  period: DateRange;
  type: AssignmentType;
  stage?: OrderAssignmentStage;
  source?: AssignmentSource;
  orderItemId?: string;
  orderItemAccessoryId?: string;
  orderId?: string;
  reason?: string;
}

export interface ReconstituteAssetAssignmentProps {
  id: string;
  assetId: string;
  period: DateRange;
  type: AssignmentType;
  stage: OrderAssignmentStage | null;
  source: AssignmentSource | null;
  orderItemId: string | null;
  orderItemAccessoryId: string | null;
  orderId: string | null;
  reason: string | null;
}

export class AssetAssignment {
  private constructor(
    public readonly id: string,
    public readonly assetId: string,
    public readonly period: DateRange,
    public readonly type: AssignmentType,
    public readonly stage: OrderAssignmentStage | null,
    public readonly source: AssignmentSource | null,
    public readonly orderItemId: string | null,
    public readonly orderItemAccessoryId: string | null,
    public readonly orderId: string | null,
    public readonly reason: string | null,
  ) {}

  static create(props: CreateAssetAssignmentProps): AssetAssignment {
    if (props.type === AssignmentType.ORDER) {
      if (!props.orderId) {
        throw new InvalidAssetAssignmentException('ORDER assignment requires orderId.');
      }
      if (!props.orderItemId) {
        throw new InvalidAssetAssignmentException('ORDER assignment requires orderItemId.');
      }
      if (!props.source) {
        throw new InvalidAssetAssignmentException('ORDER assignment requires source (OWNED or EXTERNAL).');
      }
      if (!props.stage) {
        throw new InvalidAssetAssignmentException('ORDER assignment requires stage (HOLD or COMMITTED).');
      }
    } else if (props.stage) {
      throw new InvalidAssetAssignmentException('Only ORDER assignments may have a stage.');
    }

    return new AssetAssignment(
      randomUUID(),
      props.assetId,
      props.period,
      props.type,
      props.stage ?? null,
      props.source ?? null,
      props.orderItemId ?? null,
      props.orderItemAccessoryId ?? null,
      props.orderId ?? null,
      props.reason ?? null,
    );
  }

  static reconstitute(props: ReconstituteAssetAssignmentProps): AssetAssignment {
    return new AssetAssignment(
      props.id,
      props.assetId,
      props.period,
      props.type,
      props.stage,
      props.source,
      props.orderItemId,
      props.orderItemAccessoryId,
      props.orderId,
      props.reason,
    );
  }

  isOrderAssignment(): boolean {
    return this.type === AssignmentType.ORDER;
  }

  hasStage(stage: OrderAssignmentStage): boolean {
    return this.stage === stage;
  }

  isInternalBlock(): boolean {
    return this.type === AssignmentType.BLACKOUT || this.type === AssignmentType.MAINTENANCE;
  }
}
