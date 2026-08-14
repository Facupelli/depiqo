import { createStart } from "@tanstack/react-start";
import { storefrontRequestContextMiddleware } from "@/modules/tenant-management/resolve-public-tenant-context/request-context.middleware";

export const startInstance = createStart(() => ({
	requestMiddleware: [storefrontRequestContextMiddleware],
}));
