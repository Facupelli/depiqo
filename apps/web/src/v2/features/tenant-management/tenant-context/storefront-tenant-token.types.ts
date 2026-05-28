export type StorefrontTenantTokenPayload = {
	iss: "tanstack-start-bff";
	aud: "nestjs-api";
	scope: "public-storefront";
	tenant_id: string;
	host: string;
	iat: number;
	exp: number;
};
