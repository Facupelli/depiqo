import { z } from "zod";

export const PublicSigningTokenSchema = z
	.string()
	.trim()
	.regex(/^[a-f0-9]{64}$/);

export type PublicSigningToken = z.infer<typeof PublicSigningTokenSchema>;
