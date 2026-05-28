import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { V2DocumentSigningRequestStatusSchema } from "./document-signing.schemas";

export const AcceptPublicSigningSessionBodySchema = z.object({
	signatureImageDataUrl: z.string().trim().min(1),
	acceptanceTextVersion: z.string().trim().min(1),
	accepted: z.boolean(),
});

export const AcceptPublicSigningSessionResponseSchema = z.object({
	requestId: z.string().uuid(),
	status: V2DocumentSigningRequestStatusSchema.extract(["SIGNED"]),
	signedAt: z.string().datetime(),
	downloadUrl: z.string().min(1),
	receiptTokenExpiresAt: z.string().datetime(),
});

export type AcceptPublicSigningSessionBodyDto = z.infer<
	typeof AcceptPublicSigningSessionBodySchema
>;
export type AcceptPublicSigningSessionResponseDto = z.infer<
	typeof AcceptPublicSigningSessionResponseSchema
>;

export const acceptPublicSigningSessionContract = {
	method: "POST",
	path: "/v2/document-signing/public/sessions/me/accept",
	body: AcceptPublicSigningSessionBodySchema,
	response: AcceptPublicSigningSessionResponseSchema,
} satisfies ApiContract<
	undefined,
	undefined,
	undefined,
	typeof AcceptPublicSigningSessionBodySchema,
	typeof AcceptPublicSigningSessionResponseSchema
>;
