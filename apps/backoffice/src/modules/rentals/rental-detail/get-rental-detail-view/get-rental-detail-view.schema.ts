import {
	AssetSummarySchema,
	GetRentalDetailAccessorySchema,
	GetRentalDetailDemandLineSchema,
	GetRentalDetailParamsSchema,
	GetRentalDetailResponseSchema,
	GetRentalDetailSelectionSchema,
	RentableItemSummarySchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const GetRentalDetailViewInputSchema = GetRentalDetailParamsSchema;

export const RentalDetailViewAssignedAssetSchema = z.object({
	assetId: z.string(),
	asset: AssetSummarySchema.nullable(),
	isMissing: z.boolean(),
});

export const RentalDetailViewDemandLineSchema =
	GetRentalDetailDemandLineSchema.omit({ assignedAssets: true }).extend({
		assignedAssets: z.array(RentalDetailViewAssignedAssetSchema),
	});

export const RentalDetailViewSelectionSchema =
	GetRentalDetailSelectionSchema.omit({ demandLines: true }).extend({
		rentableItem: RentableItemSummarySchema.nullable(),
		demandLines: z.array(RentalDetailViewDemandLineSchema),
	});

export const RentalDetailViewAccessorySchema =
	GetRentalDetailAccessorySchema.omit({ assignedAssets: true }).extend({
		assignedAssets: z.array(RentalDetailViewAssignedAssetSchema),
	});

export const GetRentalDetailViewResponseSchema =
	GetRentalDetailResponseSchema.omit({
		selections: true,
		accessories: true,
	}).extend({
		selections: z.array(RentalDetailViewSelectionSchema),
		accessories: z.array(RentalDetailViewAccessorySchema),
	});

export type GetRentalDetailViewInputDto = z.infer<
	typeof GetRentalDetailViewInputSchema
>;
export type RentalDetailViewAssignedAssetDto = z.infer<
	typeof RentalDetailViewAssignedAssetSchema
>;
export type RentalDetailViewDemandLineDto = z.infer<
	typeof RentalDetailViewDemandLineSchema
>;
export type RentalDetailViewSelectionDto = z.infer<
	typeof RentalDetailViewSelectionSchema
>;
export type GetRentalDetailViewResponseDto = z.infer<
	typeof GetRentalDetailViewResponseSchema
>;
