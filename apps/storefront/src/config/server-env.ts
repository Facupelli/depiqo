import { createServerOnlyFn } from "@tanstack/react-start";
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
	BFF_INTERNAL_TOKEN: z.string().min(1),
	STOREFRONT_TENANT_JWT_SECRET: z.string().min(1),
	STOREFRONT_TENANT_JWT_ISSUER: z.string().min(1),
	STOREFRONT_TENANT_JWT_AUDIENCE: z.string().min(1),
});

export type ServerEnvironment = z.infer<typeof serverEnvSchema>;

export const getServerEnvironment = createServerOnlyFn(
	(): ServerEnvironment => serverEnvSchema.parse(process.env),
);

export function validateServerEnvironment(): void {
	getServerEnvironment();
}
