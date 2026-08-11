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
	CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1),
	CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1),
	CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1),
	// R2 BRANDING
	CLOUDFLARE_R2_BRANDING_BUCKET_NAME: z.string().min(1),
	R2_BRANDING_ACCESS_KEY_ID: z.string().min(1),
	R2_BRANDING_SECRET_ACCESS_KEY: z.string().min(1),
	//
	INTERNAL_API_TOKEN: z.string(),
	ROOT_DOMAIN: z.string(),
	NODE_ENV: z.enum(["development", "production", "test"]),
});

export const serverEnv = serverEnvSchema.parse(process.env);
