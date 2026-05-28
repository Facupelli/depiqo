import { SignJWT } from "jose";
import type { TrustedTenantContext } from "./types";

const STOREFRONT_TENANT_JWT_SECRET = process.env.STOREFRONT_TENANT_JWT_SECRET;

const ISSUER = "tanstack-start-bff";
const AUDIENCE = "nestjs-api";
const TOKEN_TTL_SECONDS = 60;

export async function signStorefrontTenantToken(
	context: TrustedTenantContext,
): Promise<string> {
	if (context.face !== "storefront") {
		throw new Error(
			"Cannot sign storefront tenant token for a non-storefront context",
		);
	}

	if (!STOREFRONT_TENANT_JWT_SECRET) {
		throw new Error("Missing STOREFRONT_TENANT_JWT_SECRET");
	}

	const secret = new TextEncoder().encode(STOREFRONT_TENANT_JWT_SECRET);
	const now = Math.floor(Date.now() / 1000);

	return new SignJWT({
		scope: "public-storefront",
		tenant_id: context.tenantId,
		host: context.host,
	})
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setIssuer(ISSUER)
		.setAudience(AUDIENCE)
		.setIssuedAt(now)
		.setExpirationTime(now + TOKEN_TTL_SECONDS)
		.sign(secret);
}
