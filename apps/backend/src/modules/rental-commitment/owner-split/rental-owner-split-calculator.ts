import Decimal from 'decimal.js';
import {
  CalculateRentalOwnerSplitsInput,
  CalculateRentalOwnerSplitsOutput,
  RentalOwnerSplitFulfilledAssetInput,
  RentalOwnerSplitDemandLineInput,
  RentalOwnerSplitDraft,
  RentalOwnerSplitPriceLineInput,
} from './owner-split-calculator.types';
import { RentalOwnerSplitCalculationError } from './owner-split-calculator-errors';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RentalOwnerSplitCalculator {
  calculate(input: CalculateRentalOwnerSplitsInput): CalculateRentalOwnerSplitsOutput {
    const moneyScale = input.moneyScale ?? 2;

    const priceLinesBySelectionId = this.indexPriceLines(input.priceLines);
    const demandLinesBySelectionId = this.groupDemandLinesBySelectionId(input.demandLines);
    const fulfilledAssetsByDemandLineId = this.groupFulfilledAssetsByDemandLineId(input.fulfilledAssets);

    const splits: RentalOwnerSplitDraft[] = [];

    const sortedSelections = [...input.selections].sort((a, b) => a.id.localeCompare(b.id));

    for (const selection of sortedSelections) {
      const priceLine = priceLinesBySelectionId.get(selection.id);

      if (!priceLine) {
        throw new RentalOwnerSplitCalculationError(
          'MISSING_PRICE_LINE',
          `Missing price line for rental selection ${selection.id}.`,
          { rentalSelectionId: selection.id },
        );
      }

      const selectionFulfilledAssets = this.getAssignedAssetsForSelection({
        selectionId: selection.id,
        demandLinesBySelectionId,
        fulfilledAssetsByDemandLineId,
      });

      if (selectionFulfilledAssets.length === 0) {
        throw new RentalOwnerSplitCalculationError(
          'SELECTION_WITHOUT_ASSIGNED_ASSETS',
          `Rental selection ${selection.id} has no assigned assets.`,
          { rentalSelectionId: selection.id },
        );
      }

      const sortedFulfilledAssets = [...selectionFulfilledAssets].sort((a, b) => a.id.localeCompare(b.id));

      const basisAmountsByFulfilledAssetId = this.allocateEvenly({
        totalAmount: priceLine.netAmount,
        targetIds: sortedFulfilledAssets.map((asset) => asset.id),
        moneyScale,
      });

      for (const assignedAsset of sortedFulfilledAssets) {
        if (assignedAsset.ownershipSnapshot.kind === 'TENANT_OWNED') {
          continue;
        }

        const split = this.createThirdPartySplit({
          tenantId: input.tenantId,
          rentalId: input.rentalId,
          currency: input.currency,
          moneyScale,
          rentalSelectionId: selection.id,
          assignedAsset,
          basisAmount: basisAmountsByFulfilledAssetId.get(assignedAsset.id)!,
        });

        splits.push(split);
      }
    }

    return { splits };
  }

  private indexPriceLines(priceLines: RentalOwnerSplitPriceLineInput[]): Map<string, RentalOwnerSplitPriceLineInput> {
    const result = new Map<string, RentalOwnerSplitPriceLineInput>();

    for (const priceLine of priceLines) {
      if (result.has(priceLine.rentalSelectionId)) {
        throw new RentalOwnerSplitCalculationError(
          'DUPLICATED_PRICE_LINE',
          `Duplicated price line for rental selection ${priceLine.rentalSelectionId}.`,
          { rentalSelectionId: priceLine.rentalSelectionId },
        );
      }

      result.set(priceLine.rentalSelectionId, priceLine);
    }

    return result;
  }

  private groupDemandLinesBySelectionId(
    demandLines: RentalOwnerSplitDemandLineInput[],
  ): Map<string, RentalOwnerSplitDemandLineInput[]> {
    const result = new Map<string, RentalOwnerSplitDemandLineInput[]>();

    for (const demandLine of demandLines) {
      const existing = result.get(demandLine.sourceSelectionId) ?? [];
      existing.push(demandLine);
      result.set(demandLine.sourceSelectionId, existing);
    }

    return result;
  }

  private groupFulfilledAssetsByDemandLineId(
    assignedAssets: RentalOwnerSplitFulfilledAssetInput[],
  ): Map<string, RentalOwnerSplitFulfilledAssetInput[]> {
    const result = new Map<string, RentalOwnerSplitFulfilledAssetInput[]>();

    for (const assignedAsset of assignedAssets) {
      const existing = result.get(assignedAsset.rentalDemandLineId) ?? [];
      existing.push(assignedAsset);
      result.set(assignedAsset.rentalDemandLineId, existing);
    }

    return result;
  }

  private getAssignedAssetsForSelection(params: {
    selectionId: string;
    demandLinesBySelectionId: Map<string, RentalOwnerSplitDemandLineInput[]>;
    fulfilledAssetsByDemandLineId: Map<string, RentalOwnerSplitFulfilledAssetInput[]>;
  }): RentalOwnerSplitFulfilledAssetInput[] {
    const demandLines = params.demandLinesBySelectionId.get(params.selectionId) ?? [];

    return demandLines.flatMap((demandLine) => params.fulfilledAssetsByDemandLineId.get(demandLine.id) ?? []);
  }

  private createThirdPartySplit(params: {
    tenantId: string;
    rentalId: string;
    currency: string;
    moneyScale: number;
    rentalSelectionId: string;
    assignedAsset: RentalOwnerSplitFulfilledAssetInput;
    basisAmount: string;
  }): RentalOwnerSplitDraft {
    const { assignedAsset } = params;

    const ownershipSnapshot = assignedAsset.ownershipSnapshot;
    if (ownershipSnapshot.kind !== 'THIRD_PARTY') {
      throw new RentalOwnerSplitCalculationError(
        'INVALID_THIRD_PARTY_ASSET_OWNER',
        `Assigned asset ${assignedAsset.id} is not third-party owned.`,
        { assignedAssetId: assignedAsset.id, assetId: assignedAsset.assetId },
      );
    }

    if (ownershipSnapshot.basis !== 'NET') {
      throw new RentalOwnerSplitCalculationError(
        'UNSUPPORTED_OWNER_CONTRACT_BASIS',
        `Owner contract basis ${ownershipSnapshot.basis} is not supported in V1.`,
        {
          assignedAssetId: assignedAsset.id,
          assetId: assignedAsset.assetId,
          contractId: ownershipSnapshot.contractId,
          basis: ownershipSnapshot.basis,
        },
      );
    }

    this.assertValidOwnerShare(ownershipSnapshot.ownerShare, {
      assignedAssetId: assignedAsset.id,
      contractId: ownershipSnapshot.contractId,
    });

    const ownerAmount = new Decimal(params.basisAmount)
      .mul(ownershipSnapshot.ownerShare)
      .toDecimalPlaces(params.moneyScale, Decimal.ROUND_HALF_UP)
      .toFixed(params.moneyScale);

    return {
      tenantId: params.tenantId,
      rentalId: params.rentalId,

      rentalSelectionId: params.rentalSelectionId,
      rentalDemandLineId: assignedAsset.rentalDemandLineId,
      assignedAssetId: assignedAsset.id,
      assetId: assignedAsset.assetId,

      ownerId: ownershipSnapshot.ownerId,
      contractId: ownershipSnapshot.contractId,

      basis: 'NET',
      ownerShare: ownershipSnapshot.ownerShare,
      basisAmount: params.basisAmount,
      ownerAmount,

      currency: params.currency,
    };
  }

  private allocateEvenly(params: {
    totalAmount: string;
    targetIds: string[];
    moneyScale: number;
  }): Map<string, string> {
    const { totalAmount, targetIds, moneyScale } = params;

    if (targetIds.length === 0) {
      return new Map();
    }

    const multiplier = new Decimal(10).pow(moneyScale);

    const totalMinorUnits = new Decimal(totalAmount).mul(multiplier).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

    if (totalMinorUnits.isNegative()) {
      throw new RentalOwnerSplitCalculationError(
        'INVALID_MONEY_AMOUNT',
        `Cannot allocate a negative amount: ${totalAmount}.`,
        { totalAmount },
      );
    }

    const targetCount = new Decimal(targetIds.length);
    const baseMinorUnits = totalMinorUnits.div(targetCount).floor();

    const remainder = totalMinorUnits.minus(baseMinorUnits.mul(targetCount)).toNumber();

    const result = new Map<string, string>();

    targetIds.forEach((targetId, index) => {
      const extraMinorUnit = index < remainder ? 1 : 0;

      const amount = baseMinorUnits.plus(extraMinorUnit).div(multiplier).toFixed(moneyScale);

      result.set(targetId, amount);
    });

    return result;
  }

  private assertValidOwnerShare(ownerShare: string, details: Record<string, unknown>): void {
    const share = new Decimal(ownerShare);

    if (share.isNegative() || share.gt(1)) {
      throw new RentalOwnerSplitCalculationError(
        'INVALID_OWNER_SHARE',
        `Owner share must be between 0 and 1. Received ${ownerShare}.`,
        { ...details, ownerShare },
      );
    }
  }
}
