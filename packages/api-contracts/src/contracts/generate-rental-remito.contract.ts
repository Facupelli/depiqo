import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GenerateRentalRemitoParamsSchema = z.object({
	rentalId: z.string().trim().min(1),
});

export const GenerateRentalRemitoResponseSchema = z.custom<Blob>(
	(value) => typeof Blob === "undefined" || value instanceof Blob,
	"Expected PDF Blob",
);

export type GenerateRentalRemitoParamsDto = z.infer<
	typeof GenerateRentalRemitoParamsSchema
>;
export type GenerateRentalRemitoResponseDto = z.infer<
	typeof GenerateRentalRemitoResponseSchema
>;

export const generateRentalRemitoContract = {
	method: "GET",
	path: "/v2/contracts/rentals/:rentalId/remito",
	params: GenerateRentalRemitoParamsSchema,
	response: GenerateRentalRemitoResponseSchema,
} satisfies ApiContract<
	typeof GenerateRentalRemitoParamsSchema,
	undefined,
	undefined,
	undefined,
	typeof GenerateRentalRemitoResponseSchema
>;

export const downloadRentalRemitoContract = {
	method: "GET",
	path: "/v2/contracts/rentals/:rentalId/remito/download",
	params: GenerateRentalRemitoParamsSchema,
	response: GenerateRentalRemitoResponseSchema,
} satisfies ApiContract<
	typeof GenerateRentalRemitoParamsSchema,
	undefined,
	undefined,
	undefined,
	typeof GenerateRentalRemitoResponseSchema
>;
