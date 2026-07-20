import type { PublicTenantContext } from "@repo/api-contracts";
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
	// Fresh QueryClient per call — critical for Cloudflare Workers.
	// A singleton here would leak data between requests in the same isolate.
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				// Prevents an immediate refetch on the client right after SSR hydration.
				// Without this, the client sees hydrated data as already stale and
				// re-fetches it, wasting the SSR prefetch entirely.
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
			tenantContext: undefined as unknown as PublicTenantContext,
			user: null,
		},
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});

	// Wires up automatic SSR dehydration/hydration and streaming.
	// By default this also wraps the router with <QueryClientProvider>,
	// so you do NOT need a manual provider in __root.tsx.
	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
