export type PublicStorefrontTenantContext = {
	slug: string;
	name: string;
	customDomain: string | null;
	logoUrl: string | null;
	faviconUrl: string | null;
	primaryColor: string | null;
};

export type PublicTenantContext =
	| {
			face: "platform";
	  }
	| {
			face: "admin";
	  }
	| {
			face: "storefront";
			tenant: PublicStorefrontTenantContext;
	  };

export type TrustedTenantContext =
	| {
			face: "platform";
			host: string;
	  }
	| {
			face: "admin";
			host: string;
	  }
	| {
			face: "storefront";
			host: string;
			tenantId: string;
			slug: string;
			scope: "public-storefront";
			publicTenant: PublicStorefrontTenantContext;
	  };

export function toPublicTenantContext(
	context: TrustedTenantContext,
): PublicTenantContext {
	if (context.face === "platform") {
		return { face: "platform" };
	}

	if (context.face === "admin") {
		return { face: "admin" };
	}

	return {
		face: "storefront",
		tenant: context.publicTenant,
	};
}
