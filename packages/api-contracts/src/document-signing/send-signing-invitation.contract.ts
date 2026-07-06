import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const SendSigningInvitationParamsSchema = z.object({
	orderId: z.string().trim().min(1),
});

export const SendSigningInvitationBodySchema = z.object({
	recipientEmail: z.string().trim().email().optional(),
});

export const SendSigningInvitationResponseSchema = z.object({
	requestId: z.string().uuid(),
	documentNumber: z.string().min(1),
	recipientEmail: z.string().email(),
	expiresAt: z.string().datetime(),
	documentHash: z.string().min(1),
	reusedExistingRequest: z.boolean(),
});

export type SendSigningInvitationParamsDto = z.infer<
	typeof SendSigningInvitationParamsSchema
>;
export type SendSigningInvitationBodyDto = z.infer<
	typeof SendSigningInvitationBodySchema
>;
export type SendSigningInvitationResponseDto = z.infer<
	typeof SendSigningInvitationResponseSchema
>;

export const sendSigningInvitationContract = {
	method: "POST",
	path: "/document-signing/orders/:orderId/sessions",
	params: SendSigningInvitationParamsSchema,
	body: SendSigningInvitationBodySchema,
	response: SendSigningInvitationResponseSchema,
} satisfies ApiContract<
	typeof SendSigningInvitationParamsSchema,
	undefined,
	undefined,
	typeof SendSigningInvitationBodySchema,
	typeof SendSigningInvitationResponseSchema
>;
