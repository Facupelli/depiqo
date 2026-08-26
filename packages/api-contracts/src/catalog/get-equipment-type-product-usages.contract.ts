import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetEquipmentTypeProductUsagesQuerySchema = z.object({
	equipmentTypeIds: z
		.string()
		.trim()
		.min(1)
		.transform((value) =>
			value
				.split(",")
				.map((id) => id.trim())
				.filter(Boolean),
		)
		.pipe(z.array(z.string().min(1)).min(1).max(100)),
});

export const EquipmentTypeProductUsageProductSchema = z.object({
	rentableItemId: z.string(),
	name: z.string(),
	quantityPerItem: z.number().int().positive(),
});

export const EquipmentTypeProductUsageSchema = z.object({
	equipmentTypeId: z.string(),
	products: z.array(EquipmentTypeProductUsageProductSchema),
});

export const GetEquipmentTypeProductUsagesResponseSchema = z.array(
	EquipmentTypeProductUsageSchema,
);

export type GetEquipmentTypeProductUsagesQueryDto = z.infer<
	typeof GetEquipmentTypeProductUsagesQuerySchema
>;
export type EquipmentTypeProductUsageProductDto = z.infer<
	typeof EquipmentTypeProductUsageProductSchema
>;
export type EquipmentTypeProductUsageDto = z.infer<
	typeof EquipmentTypeProductUsageSchema
>;
export type GetEquipmentTypeProductUsagesResponseDto = z.infer<
	typeof GetEquipmentTypeProductUsagesResponseSchema
>;

export const getEquipmentTypeProductUsagesContract = {
	method: "GET",
	path: "/catalog/equipment-type-product-usages",
	query: GetEquipmentTypeProductUsagesQuerySchema,
	response: GetEquipmentTypeProductUsagesResponseSchema,
} satisfies ApiContract<
	undefined,
	typeof GetEquipmentTypeProductUsagesQuerySchema,
	undefined,
	undefined,
	typeof GetEquipmentTypeProductUsagesResponseSchema
>;
