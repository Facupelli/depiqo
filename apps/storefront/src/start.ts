import { createStart } from "@tanstack/react-start";
import { marketingIndexingMiddleware } from "@/modules/marketing/marketing-indexing.middleware";
import { storefrontRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";

export const startInstance = createStart(() => ({
	requestMiddleware: [
		marketingIndexingMiddleware,
		storefrontRequestContextMiddleware,
	],
}));
