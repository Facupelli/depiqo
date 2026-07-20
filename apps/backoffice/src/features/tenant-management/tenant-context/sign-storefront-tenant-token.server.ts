import type { TrustedTenantContext } from "@repo/api-contracts";
import { SignJWT } from "jose";
import { serverEnv } from "@/config/server-env";

const TOKEN_TTL_SECONDS = 60;

export async function signStorefrontTenantToken(
	context: TrustedTenantContext,
): Promise<string> {
	if (context.face !== "storefront") {
		throw new Error(
			"Cannot sign storefront tenant token for a non-storefront context",
		);
	}

	const secret = new TextEncoder().encode(
		serverEnv.STOREFRONT_TENANT_JWT_SECRET,
	);
	const now = Math.floor(Date.now() / 1000);

	return new SignJWT({
		scope: "public-storefront",
		tenant_id: context.tenantId,
		host: context.host,
	})
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setIssuer(serverEnv.STOREFRONT_TENANT_JWT_ISSUER)
		.setAudience(serverEnv.STOREFRONT_TENANT_JWT_AUDIENCE)
		.setIssuedAt(now)
		.setExpirationTime(now + TOKEN_TTL_SECONDS)
		.sign(secret);
}
