import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GenerateRentalBudgetParamsSchema = z.object({
	rentalId: z.string().trim().min(1),
});

const OptionalTrimmedStringSchema = z.string().trim().min(1).optional();

export const GenerateRentalBudgetBodySchema = z.object({
	customer: z
		.object({
			fullName: OptionalTrimmedStringSchema,
			documentNumber: OptionalTrimmedStringSchema,
			address: OptionalTrimmedStringSchema,
			phone: OptionalTrimmedStringSchema,
		})
		.optional(),
});

export const GenerateRentalBudgetResponseSchema = z.custom<Blob>(
	(value) => typeof Blob === "undefined" || value instanceof Blob,
	"Expected PDF Blob",
);

export type GenerateRentalBudgetParamsDto = z.infer<typeof GenerateRentalBudgetParamsSchema>;
export type GenerateRentalBudgetBodyDto = z.infer<typeof GenerateRentalBudgetBodySchema>;
export type GenerateRentalBudgetResponseDto = z.infer<typeof GenerateRentalBudgetResponseSchema>;

export const generateRentalBudgetContract = {
	method: "POST",
	path: "/contracts/rentals/:rentalId/budget",
	params: GenerateRentalBudgetParamsSchema,
	body: GenerateRentalBudgetBodySchema,
	response: GenerateRentalBudgetResponseSchema,
} satisfies ApiContract<
	typeof GenerateRentalBudgetParamsSchema,
	undefined,
	undefined,
	typeof GenerateRentalBudgetBodySchema,
	typeof GenerateRentalBudgetResponseSchema
>;
