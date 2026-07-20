import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import {
	createStorefrontQueryClient,
	TanstackQueryProvider,
} from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const queryClient = createStorefrontQueryClient();

	const router = createTanStackRouter({
		routeTree,
		context: { queryClient },
		Wrap: ({ children }) => (
			<TanstackQueryProvider queryClient={queryClient}>
				{children}
			</TanstackQueryProvider>
		),
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});

	setupRouterSsrQueryIntegration({
		router,
		queryClient,
		wrapQueryClient: false,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
