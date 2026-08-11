import { z } from "zod";

const clientEnvSchema = z.object({
	VITE_BRANDING_R2_PUBLIC_URL: z.url(),
	VITE_R2_PUBLIC_URL: z.url(),
});

export const clientEnv = clientEnvSchema.parse(import.meta.env);
