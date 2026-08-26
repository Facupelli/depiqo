import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetRentalAccessoryDefaultsParamsSchema = z.object({
	rentalId: z.string().trim().min(1),
});

export const GetRentalAccessoryDefaultsSuggestionSchema = z.object({
	sourceRentalDemandLineId: z.string(),
	sourceEquipmentTypeId: z.string(),
	sourceEquipmentTypeName: z.string(),
	accessoryEquipmentTypeId: z.string(),
	accessoryEquipmentTypeName: z.string(),
	quantityPerUnit: z.number().int().positive(),
	sourceQuantity: z.number().int().positive(),
	recommendedQuantity: z.number().int().positive(),
	availableCount: z.number().int().nonnegative(),
});

export const GetRentalAccessoryDefaultsResponseSchema = z.object({
	rentalOrderId: z.string(),
	suggestions: z.array(GetRentalAccessoryDefaultsSuggestionSchema),
});

export type GetRentalAccessoryDefaultsParamsDto = z.infer<
	typeof GetRentalAccessoryDefaultsParamsSchema
>;
export type GetRentalAccessoryDefaultsSuggestionDto = z.infer<
	typeof GetRentalAccessoryDefaultsSuggestionSchema
>;
export type GetRentalAccessoryDefaultsResponseDto = z.infer<
	typeof GetRentalAccessoryDefaultsResponseSchema
>;

export const getRentalAccessoryDefaultsContract = {
	method: "GET",
	path: "/asset-inventory/rentals/:rentalId/accessory-defaults",
	params: GetRentalAccessoryDefaultsParamsSchema,
	response: GetRentalAccessoryDefaultsResponseSchema,
} satisfies ApiContract<
	typeof GetRentalAccessoryDefaultsParamsSchema,
	undefined,
	undefined,
	undefined,
	typeof GetRentalAccessoryDefaultsResponseSchema
>;
