import { z } from "zod";

export const SigningDocumentTypeSchema = z.enum(["RENTAL_AGREEMENT"]);

export const V2DocumentSigningRequestStatusSchema = z.enum([
	"PENDING",
	"SENT",
	"VIEWED",
	"SIGNED",
	"EXPIRED",
	"CANCELLED",
	"FAILED",
]);
