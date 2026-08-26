import { z } from "zod";

import type { ApiContract } from "../api-contract";
import {
	SigningDocumentTypeSchema,
	V2DocumentSigningRequestStatusSchema,
} from "./document-signing.schemas";

export const GetPublicSigningSessionResponseSchema = z.object({
	requestId: z.string().uuid(),
	documentType: SigningDocumentTypeSchema,
	status: V2DocumentSigningRequestStatusSchema,
	expiresAt: z.string().datetime().nullable(),
	signedAt: z.string().datetime().nullable(),
	document: z.object({
		documentNumber: z.string().nullable(),
		displayFileName: z.string().min(1),
		contentType: z.string().min(1),
		byteSize: z.number().int().nonnegative(),
		sha256: z.string().nullable(),
		hashAlgorithm: z.string().nullable(),
	}),
	signer: z.object({
		name: z.string().min(1),
		email: z.string().email().nullable(),
		phone: z.string().nullable(),
	}),
	acceptance: z.object({
		textVersion: z.string().min(1),
		textSnapshot: z.string().min(1),
	}),
});

export type GetPublicSigningSessionResponseDto = z.infer<
	typeof GetPublicSigningSessionResponseSchema
>;

export const getPublicSigningSessionContract = {
	method: "GET",
	path: "/document-signing/public/sessions/me",
	response: GetPublicSigningSessionResponseSchema,
} satisfies ApiContract<
	undefined,
	undefined,
	undefined,
	undefined,
	typeof GetPublicSigningSessionResponseSchema
>;
