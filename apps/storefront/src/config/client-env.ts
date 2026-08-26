import { z } from "zod";

const clientEnvSchema = z.object({
	VITE_BRANDING_R2_PUBLIC_URL: z.url(),
	VITE_GOOGLE_CLIENT_ID: z.string().min(1),
	VITE_R2_PUBLIC_URL: z.url(),
	VITE_SHARED_AUTH_ORIGIN: z.url(),
});

export const clientEnv = clientEnvSchema.parse(import.meta.env);
