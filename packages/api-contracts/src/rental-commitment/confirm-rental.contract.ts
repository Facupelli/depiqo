import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const ConfirmRentalParamsSchema = z.object({
	rentalId: z.string().trim().min(1),
});

export const ConfirmRentalBodySchema = z.object({
	expectedVersion: z.number().int().nonnegative(),
});

export const ConfirmRentalResponseSchema = z.void();

export type ConfirmRentalParamsDto = z.infer<typeof ConfirmRentalParamsSchema>;
export type ConfirmRentalBodyDto = z.infer<typeof ConfirmRentalBodySchema>;
export type ConfirmRentalResponseDto = z.infer<
	typeof ConfirmRentalResponseSchema
>;

export const confirmRentalContract = {
	method: "POST",
	path: "/rental-commitments/rentals/:rentalId/confirm",
	params: ConfirmRentalParamsSchema,
	body: ConfirmRentalBodySchema,
	response: ConfirmRentalResponseSchema,
} satisfies ApiContract<
	typeof ConfirmRentalParamsSchema,
	undefined,
	undefined,
	typeof ConfirmRentalBodySchema,
	typeof ConfirmRentalResponseSchema
>;
