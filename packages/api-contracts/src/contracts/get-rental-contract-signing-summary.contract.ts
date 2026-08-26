import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { V2DocumentSigningRequestStatusSchema } from "../document-signing";

export const GetRentalContractSigningSummaryParamsSchema = z.object({
	rentalId: z.string().trim().min(1),
});

export const RentalContractStatusSchema = z.enum([
	"NOT_GENERATED",
	"DRAFT",
	"GENERATED",
	"SIGNING_REQUESTED",
	"SIGNED",
	"RESIGN_REQUIRED",
	"VOID",
]);

export const RentalContractSigningSummaryArtifactSchema = z.object({
	id: z.string(),
	fileName: z.string(),
	createdAt: z.string().datetime(),
});

export const RentalContractSigningSummaryLatestRequestSchema = z.object({
	id: z.string(),
	status: V2DocumentSigningRequestStatusSchema,
	signerName: z.string(),
	signerEmail: z.string().nullable(),
	signerPhone: z.string().nullable(),
	sentAt: z.string().datetime().nullable(),
	viewedAt: z.string().datetime().nullable(),
	signedAt: z.string().datetime().nullable(),
	expiresAt: z.string().datetime().nullable(),
	cancelledAt: z.string().datetime().nullable(),
	failedAt: z.string().datetime().nullable(),
});

export const RentalContractSigningSummaryAcceptanceSchema = z.object({
	id: z.string(),
	signerName: z.string(),
	signerEmail: z.string().nullable(),
	acceptedAt: z.string().datetime(),
	acceptedIpAddress: z.string().nullable(),
	acceptanceTextVersion: z.string(),
});

export const GetRentalContractSigningSummaryResponseSchema = z.object({
	contractId: z.string().nullable(),
	rentalId: z.string(),
	contractStatus: RentalContractStatusSchema,
	documentNumber: z.string().nullable(),
	latestSigningRequest:
		RentalContractSigningSummaryLatestRequestSchema.nullable(),
	acceptance: RentalContractSigningSummaryAcceptanceSchema.nullable(),
	artifacts: z.object({
		unsignedPdf: RentalContractSigningSummaryArtifactSchema.nullable(),
		signedPdf: RentalContractSigningSummaryArtifactSchema.nullable(),
	}),
});

export type GetRentalContractSigningSummaryParamsDto = z.infer<
	typeof GetRentalContractSigningSummaryParamsSchema
>;
export type RentalContractStatusDto = z.infer<
	typeof RentalContractStatusSchema
>;
export type RentalContractSigningSummaryArtifactDto = z.infer<
	typeof RentalContractSigningSummaryArtifactSchema
>;
export type RentalContractSigningSummaryLatestRequestDto = z.infer<
	typeof RentalContractSigningSummaryLatestRequestSchema
>;
export type RentalContractSigningSummaryAcceptanceDto = z.infer<
	typeof RentalContractSigningSummaryAcceptanceSchema
>;
export type GetRentalContractSigningSummaryResponseDto = z.infer<
	typeof GetRentalContractSigningSummaryResponseSchema
>;

export const getRentalContractSigningSummaryContract = {
	method: "GET",
	path: "/contracts/rentals/:rentalId/signing-summary",
	params: GetRentalContractSigningSummaryParamsSchema,
	response: GetRentalContractSigningSummaryResponseSchema,
} satisfies ApiContract<
	typeof GetRentalContractSigningSummaryParamsSchema,
	undefined,
	undefined,
	undefined,
	typeof GetRentalContractSigningSummaryResponseSchema
>;
