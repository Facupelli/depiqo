import type {
	AssetSummaryDto,
	RentableItemSummaryDto,
} from "@repo/api-contracts";
import { getAssetSummaries } from "@/features/asset-inventory/assets/get-asset-summaries/get-asset-summaries.api";
import { getRentableItemSummaries } from "@/features/catalog/rentable-items/get-rentable-item-summaries/get-rentable-item-summaries.api";
import { getRentalDetail } from "../get-rental-detail/get-rental-detail.api";
import type {
	GetRentalDetailViewInputDto,
	GetRentalDetailViewResponseDto,
	RentalDetailViewAssignedAssetDto,
} from "./get-rental-detail-view.schema";
import {
	GetRentalDetailViewInputSchema,
	GetRentalDetailViewResponseSchema,
} from "./get-rental-detail-view.schema";

export async function getRentalDetailView(
	input: GetRentalDetailViewInputDto,
): Promise<GetRentalDetailViewResponseDto> {
	const parsedInput = GetRentalDetailViewInputSchema.parse(input);
	const rental = await getRentalDetail(parsedInput.rentalId);

	const assetIds = unique([
		...rental.equipment.flatMap((line) =>
			line.assignedAssets.map((assignment) => assignment.assetId),
		),
		...rental.accessories.flatMap((accessory) =>
			accessory.assignedAssets.map((assignment) => assignment.assetId),
		),
	]);
	const rentableItemIds = unique(
		rental.equipment.map((line) => line.rentableItemId),
	);

	const [assetSummaries, rentableItemSummaries] = await Promise.all([
		assetIds.length > 0 ? getAssetSummaries(assetIds) : Promise.resolve([]),
		rentableItemIds.length > 0
			? getRentableItemSummaries(rentableItemIds)
			: Promise.resolve([]),
	]);

	const assetsById = new Map<string, AssetSummaryDto>();
	for (const asset of assetSummaries) {
		assetsById.set(asset.id, asset);
	}

	const rentableItemsById = new Map<string, RentableItemSummaryDto>();
	for (const rentableItem of rentableItemSummaries) {
		rentableItemsById.set(rentableItem.id, rentableItem);
	}

	return GetRentalDetailViewResponseSchema.parse({
		...rental,
		equipment: rental.equipment.map((line) => ({
			...line,
			rentableItem: rentableItemsById.get(line.rentableItemId) ?? null,
			assignedAssets: enrichAssignedAssets(line.assignedAssets, assetsById),
		})),
		accessories: rental.accessories.map((accessory) => ({
			...accessory,
			assignedAssets: enrichAssignedAssets(
				accessory.assignedAssets,
				assetsById,
			),
		})),
	});
}

function enrichAssignedAssets(
	assignedAssets: Array<{ assetId: string }>,
	assetsById: Map<string, AssetSummaryDto>,
): RentalDetailViewAssignedAssetDto[] {
	return assignedAssets.map((assignment) => {
		const asset = assetsById.get(assignment.assetId) ?? null;

		return {
			assetId: assignment.assetId,
			asset,
			isMissing: asset === null,
		};
	});
}

function unique(values: string[]) {
	return [...new Set(values)];
}
