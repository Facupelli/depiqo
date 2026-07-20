import type { TrustedTenantContext } from "@repo/api-contracts";
import { createServerOnlyFn } from "@tanstack/react-start";
import { SignJWT } from "jose";
import { getServerEnvironment } from "@/config/server-env";

const TOKEN_TTL_SECONDS = 60;

type TrustedStorefrontTenantContext = Extract<
	TrustedTenantContext,
	{ face: "storefront" }
>;

export const signStorefrontTenantToken = createServerOnlyFn(
	async (context: TrustedStorefrontTenantContext): Promise<string> => {
		const environment = getServerEnvironment();
		const secret = new TextEncoder().encode(
			environment.STOREFRONT_TENANT_JWT_SECRET,
		);
		const now = Math.floor(Date.now() / 1000);

		return new SignJWT({
			scope: "public-storefront",
			tenant_id: context.tenantId,
			host: context.host,
		})
			.setProtectedHeader({ alg: "HS256", typ: "JWT" })
			.setIssuer(environment.STOREFRONT_TENANT_JWT_ISSUER)
			.setAudience(environment.STOREFRONT_TENANT_JWT_AUDIENCE)
			.setIssuedAt(now)
			.setExpirationTime(now + TOKEN_TTL_SECONDS)
			.sign(secret);
	},
);
