import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const CancelRentalParamsSchema = z.object({
	rentalId: z.string().trim().min(1),
});

export const CancelRentalResponseSchema = z.void();

export type CancelRentalParamsDto = z.infer<typeof CancelRentalParamsSchema>;
export type CancelRentalResponseDto = z.infer<
	typeof CancelRentalResponseSchema
>;

export const cancelRentalContract = {
	method: "DELETE",
	path: "/rental-commitments/rentals/:rentalId",
	params: CancelRentalParamsSchema,
	response: CancelRentalResponseSchema,
} satisfies ApiContract<
	typeof CancelRentalParamsSchema,
	undefined,
	undefined,
	undefined,
	typeof CancelRentalResponseSchema
>;
