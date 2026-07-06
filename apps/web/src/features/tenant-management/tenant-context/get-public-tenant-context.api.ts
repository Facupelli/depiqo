import { createServerFn } from "@tanstack/react-start";
import { resolveTrustedTenantContextFromRequest } from "./resolve-trusted-tenant-context.server";
import { toPublicTenantContext } from "./types";

export const getPublicTenantContext = createServerFn({ method: "GET" }).handler(
	async () => {
		const trustedContext = await resolveTrustedTenantContextFromRequest();

		return toPublicTenantContext(trustedContext.data);
	},
);
