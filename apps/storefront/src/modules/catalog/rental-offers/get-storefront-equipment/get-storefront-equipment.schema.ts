import { z } from "zod";

export const GetStorefrontEquipmentInputSchema = z.object({
	branchId: z.string().trim().min(1),
	periodStart: z.iso.date().optional(),
	periodEnd: z.iso.date().optional(),
	categoryId: z.string().trim().min(1).optional(),
	search: z.string().trim().min(1).optional(),
	page: z.coerce.number().int().positive(),
	pageSize: z.coerce.number().int().positive().max(100),
});

export type GetStorefrontEquipmentInputDto = z.infer<
	typeof GetStorefrontEquipmentInputSchema
>;
