import type { ResolvedTenantContext } from "@repo/schemas";
import { createServerFn } from "@tanstack/react-start";
import { resolveTenantContextByHostname } from "./tenant-context.service";

export const resolveTenantContext = createServerFn({ method: "GET" }).handler(
	async (): Promise<ResolvedTenantContext> => {
		return resolveTenantContextByHostname();
	},
);
