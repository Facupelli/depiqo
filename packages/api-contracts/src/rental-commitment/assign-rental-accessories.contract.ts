import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const AssignRentalAccessoriesParamsSchema = z.object({
	rentalId: z.string().trim().min(1),
});

export const AssignRentalAccessoriesItemSchema = z.object({
	sourceRentalDemandLineId: z.string().trim().min(1).optional(),
	equipmentTypeId: z.string().trim().min(1),
	quantity: z.coerce.number().int().positive(),
});

export const AssignRentalAccessoriesBodySchema = z.object({
	accessories: z.array(AssignRentalAccessoriesItemSchema),
});

export const AssignRentalAccessoriesResponseSchema = z.void();

export type AssignRentalAccessoriesParamsDto = z.infer<
	typeof AssignRentalAccessoriesParamsSchema
>;
export type AssignRentalAccessoriesItemDto = z.infer<
	typeof AssignRentalAccessoriesItemSchema
>;
export type AssignRentalAccessoriesBodyDto = z.infer<
	typeof AssignRentalAccessoriesBodySchema
>;
export type AssignRentalAccessoriesResponseDto = z.infer<
	typeof AssignRentalAccessoriesResponseSchema
>;

export const assignRentalAccessoriesContract = {
	method: "PUT",
	path: "/rental-commitments/rentals/:rentalId/accessories",
	params: AssignRentalAccessoriesParamsSchema,
	body: AssignRentalAccessoriesBodySchema,
	response: AssignRentalAccessoriesResponseSchema,
} satisfies ApiContract<
	typeof AssignRentalAccessoriesParamsSchema,
	undefined,
	undefined,
	typeof AssignRentalAccessoriesBodySchema,
	typeof AssignRentalAccessoriesResponseSchema
>;
