import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const StreamPublicSignedReceiptDocumentQuerySchema = z.object({
	token: z.string().trim().min(1).optional(),
});

export const StreamPublicSignedReceiptDocumentResponseSchema = z.unknown();

export type StreamPublicSignedReceiptDocumentQueryDto = z.infer<
	typeof StreamPublicSignedReceiptDocumentQuerySchema
>;

export const streamPublicSignedReceiptDocumentContract = {
	method: "GET",
	path: "/document-signing/public/receipts/signed-pdf",
	query: StreamPublicSignedReceiptDocumentQuerySchema,
	response: StreamPublicSignedReceiptDocumentResponseSchema,
} satisfies ApiContract<
	undefined,
	typeof StreamPublicSignedReceiptDocumentQuerySchema,
	undefined,
	undefined,
	typeof StreamPublicSignedReceiptDocumentResponseSchema
>;
