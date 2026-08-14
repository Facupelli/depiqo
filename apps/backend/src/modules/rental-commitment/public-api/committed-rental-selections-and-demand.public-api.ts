import { Result } from 'neverthrow';

export interface GetCommittedRentalSelectionsAndDemandInput {
  tenantId: string;
  rentalId: string;
}

export type CommittedRentableItemKind = 'SINGLE' | 'PACKAGE' | 'KIT' | 'BUNDLE';

export interface CommittedRentalSelection {
  selectionId: string;
  rentalOfferId: string;
  rentableItemId: string;
  rentableItemNameSnapshot: string;
  rentableItemKindSnapshot: CommittedRentableItemKind;
  quantity: number;
}

export interface CommittedRentalDemandLine {
  demandLineId: string;
  sourceSelectionId: string;
  equipmentTypeId: string;
  equipmentTypeNameSnapshot: string;
  quantity: number;
}

export interface CommittedRentalSelectionsAndDemandResult {
  selections: CommittedRentalSelection[];
  demandLines: CommittedRentalDemandLine[];
}

export interface CommittedRentalSelectionsAndDemandError {
  code: 'RentalNotFound';
  message: string;
}

export abstract class CommittedRentalSelectionsAndDemand {
  abstract getCommittedRentalSelectionsAndDemand(
    input: GetCommittedRentalSelectionsAndDemandInput,
  ): Promise<Result<CommittedRentalSelectionsAndDemandResult, CommittedRentalSelectionsAndDemandError>>;
}
