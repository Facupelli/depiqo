import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const AssignCustomerToDraftRentalParamsSchema = z.object({
	rentalId: z.string().trim().min(1),
});

export const AssignCustomerToDraftRentalBodySchema = z.object({
	customerId: z.string().trim().min(1),
});

export const AssignCustomerToDraftRentalResponseSchema = z.void();

export type AssignCustomerToDraftRentalParamsDto = z.infer<
	typeof AssignCustomerToDraftRentalParamsSchema
>;
export type AssignCustomerToDraftRentalBodyDto = z.infer<
	typeof AssignCustomerToDraftRentalBodySchema
>;
export type AssignCustomerToDraftRentalResponseDto = z.infer<
	typeof AssignCustomerToDraftRentalResponseSchema
>;

export const assignCustomerToDraftRentalContract = {
	method: "PUT",
	path: "/v2/rental-commitments/rentals/:rentalId/customer",
	params: AssignCustomerToDraftRentalParamsSchema,
	body: AssignCustomerToDraftRentalBodySchema,
	response: AssignCustomerToDraftRentalResponseSchema,
} satisfies ApiContract<
	typeof AssignCustomerToDraftRentalParamsSchema,
	undefined,
	undefined,
	typeof AssignCustomerToDraftRentalBodySchema,
	typeof AssignCustomerToDraftRentalResponseSchema
>;
