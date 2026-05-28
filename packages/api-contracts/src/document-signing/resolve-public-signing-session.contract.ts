import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const ResolvePublicSigningSessionQuerySchema = z.object({
	token: z.string().trim().min(1).optional(),
});

export const ResolvePublicSigningSessionResponseSchema = z.object({
	requestId: z.string().uuid(),
});

export type ResolvePublicSigningSessionQueryDto = z.infer<
	typeof ResolvePublicSigningSessionQuerySchema
>;
export type ResolvePublicSigningSessionResponseDto = z.infer<
	typeof ResolvePublicSigningSessionResponseSchema
>;

export const resolvePublicSigningSessionContract = {
	method: "GET",
	path: "/v2/document-signing/public/sessions/resolve",
	query: ResolvePublicSigningSessionQuerySchema,
	response: ResolvePublicSigningSessionResponseSchema,
} satisfies ApiContract<
	undefined,
	typeof ResolvePublicSigningSessionQuerySchema,
	undefined,
	undefined,
	typeof ResolvePublicSigningSessionResponseSchema
>;
