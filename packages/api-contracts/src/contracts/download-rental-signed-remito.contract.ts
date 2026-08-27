import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const DownloadRentalSignedRemitoParamsSchema = z.object({
	rentalId: z.string().trim().min(1),
});

export const DownloadRentalSignedRemitoResponseSchema = z.custom<Blob>(
	(value) => typeof Blob === "undefined" || value instanceof Blob,
	"Expected PDF Blob",
);

export type DownloadRentalSignedRemitoParamsDto = z.infer<
	typeof DownloadRentalSignedRemitoParamsSchema
>;
export type DownloadRentalSignedRemitoResponseDto = z.infer<
	typeof DownloadRentalSignedRemitoResponseSchema
>;

export const downloadRentalSignedRemitoContract = {
	method: "GET",
	path: "/contracts/rentals/:rentalId/signed-remito/download",
	params: DownloadRentalSignedRemitoParamsSchema,
	response: DownloadRentalSignedRemitoResponseSchema,
} satisfies ApiContract<
	typeof DownloadRentalSignedRemitoParamsSchema,
	undefined,
	undefined,
	undefined,
	typeof DownloadRentalSignedRemitoResponseSchema
>;
