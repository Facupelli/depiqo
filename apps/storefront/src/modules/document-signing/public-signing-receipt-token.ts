import { z } from "zod";

export const PublicSigningReceiptTokenSchema = z
	.string()
	.trim()
	.regex(/^[a-f0-9]{64}$/);

export type PublicSigningReceiptToken = z.infer<
	typeof PublicSigningReceiptTokenSchema
>;
