import {
	AssetSummarySchema,
	GetRentalDetailAccessorySchema,
	GetRentalDetailEquipmentLineSchema,
	GetRentalDetailParamsSchema,
	GetRentalDetailResponseSchema,
	RentableItemSummarySchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const GetRentalDetailViewInputSchema = GetRentalDetailParamsSchema;

export const RentalDetailViewAssignedAssetSchema = z.object({
	assetId: z.string(),
	asset: AssetSummarySchema.nullable(),
	isMissing: z.boolean(),
});

export const RentalDetailViewEquipmentLineSchema =
	GetRentalDetailEquipmentLineSchema.omit({ assignedAssets: true }).extend({
		rentableItem: RentableItemSummarySchema.nullable(),
		assignedAssets: z.array(RentalDetailViewAssignedAssetSchema),
	});

export const RentalDetailViewAccessorySchema =
	GetRentalDetailAccessorySchema.omit({ assignedAssets: true }).extend({
		assignedAssets: z.array(RentalDetailViewAssignedAssetSchema),
	});

export const GetRentalDetailViewResponseSchema =
	GetRentalDetailResponseSchema.omit({
		equipment: true,
		accessories: true,
	}).extend({
		equipment: z.array(RentalDetailViewEquipmentLineSchema),
		accessories: z.array(RentalDetailViewAccessorySchema),
	});

export type GetRentalDetailViewInputDto = z.infer<
	typeof GetRentalDetailViewInputSchema
>;
export type RentalDetailViewAssignedAssetDto = z.infer<
	typeof RentalDetailViewAssignedAssetSchema
>;
export type RentalDetailViewEquipmentLineDto = z.infer<
	typeof RentalDetailViewEquipmentLineSchema
>;
export type RentalDetailViewAccessoryDto = z.infer<
	typeof RentalDetailViewAccessorySchema
>;
export type GetRentalDetailViewResponseDto = z.infer<
	typeof GetRentalDetailViewResponseSchema
>;
