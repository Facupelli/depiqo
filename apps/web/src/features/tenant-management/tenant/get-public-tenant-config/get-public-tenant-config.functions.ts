import { createServerFn } from "@tanstack/react-start";
import { getPublicTenantConfig } from "./get-public-tenant-config.api";

export const getPublicTenantConfigFn = createServerFn({
	method: "GET",
}).handler(async () => getPublicTenantConfig());
