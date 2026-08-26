import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const StreamPublicUnsignedDocumentQuerySchema = z.object({
	token: z.string().trim().min(1).optional(),
});

export const StreamPublicUnsignedDocumentResponseSchema = z.unknown();

export type StreamPublicUnsignedDocumentQueryDto = z.infer<
	typeof StreamPublicUnsignedDocumentQuerySchema
>;

export const streamPublicUnsignedDocumentContract = {
	method: "GET",
	path: "/document-signing/public/sessions/me/unsigned-pdf",
	query: StreamPublicUnsignedDocumentQuerySchema,
	response: StreamPublicUnsignedDocumentResponseSchema,
} satisfies ApiContract<
	undefined,
	typeof StreamPublicUnsignedDocumentQuerySchema,
	undefined,
	undefined,
	typeof StreamPublicUnsignedDocumentResponseSchema
>;
