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
});

export function validateServerEnvironment() {
	serverEnvSchema.parse(process.env);
}
