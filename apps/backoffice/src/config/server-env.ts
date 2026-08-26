import { z } from "zod";

const backendOriginSchema = z.url().refine((value) => {
	const url = new URL(value);
	return (
		url.pathname === "/" &&
		!url.username &&
		!url.password &&
		!url.search &&
		!url.hash
	);
}, "BACKEND_URL must contain only the scheme, hostname, and optional port");

const serverEnvSchema = z.object({
	BACKEND_URL: backendOriginSchema,
	BACKEND_PROXY_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
	CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
	// R2 EQUIPMENT
	R2_EQUIPMENT_ACCESS_KEY_ID: z.string().min(1),
	R2_EQUIPMENT_SECRET_ACCESS_KEY: z.string().min(1),
	R2_EQUIPMENT_BUCKET_NAME: z.string().min(1),
	// R2 BRANDING
	R2_BRANDING_BUCKET_NAME: z.string().min(1),
	R2_BRANDING_ACCESS_KEY_ID: z.string().min(1),
	R2_BRANDING_SECRET_ACCESS_KEY: z.string().min(1),
	NODE_ENV: z.enum(["development", "production", "test"]),
});

export const serverEnv = serverEnvSchema.parse(process.env);
