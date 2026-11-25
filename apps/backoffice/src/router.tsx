import { MutationCache, QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";

type QueryKey = readonly unknown[];

type InvalidateTarget =
	| QueryKey
	| QueryKey[]
	| ((variables: unknown) => QueryKey | QueryKey[]);

function resolveInvalidateTargets(
	invalidates: InvalidateTarget | undefined,
	variables: unknown,
): QueryKey[] {
	if (!invalidates) {
		return [];
	}

	const resolved =
		typeof invalidates === "function" ? invalidates(variables) : invalidates;

	if (resolved.length === 0) {
		return [];
	}

	return Array.isArray(resolved[0])
		? (resolved as QueryKey[])
		: [resolved as QueryKey];
}

export function getRouter() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60 * 1000,
			},
		},
		mutationCache: new MutationCache({
			onSuccess: async (_data, variables, _context, mutation) => {
				const invalidateTargets = resolveInvalidateTargets(
					mutation.meta?.invalidates as InvalidateTarget | undefined,
					variables,
				);

				await Promise.all(
					invalidateTargets.map((queryKey) =>
						queryClient.invalidateQueries({ queryKey }),
					),
				);
			},
		}),
	});

	const router = createTanStackRouter({
		routeTree,
		context: {
			queryClient,
			user: null,
		},
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});

	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
