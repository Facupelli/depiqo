import {
	MutationCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";

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

export function createStorefrontQueryClient() {
	let queryClient: QueryClient;

	queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60 * 1000,
			},
		},
		mutationCache: new MutationCache({
			onSuccess: async (_data, variables, _context, mutation) => {
				const targets = resolveInvalidateTargets(
					mutation.meta?.invalidates as InvalidateTarget | undefined,
					variables,
				);

				await Promise.all(
					targets.map((queryKey) =>
						queryClient.invalidateQueries({ queryKey }),
					),
				);
			},
		}),
	});

	return queryClient;
}

export function TanstackQueryProvider({
	children,
	queryClient,
}: {
	children: ReactNode;
	queryClient: QueryClient;
}) {
	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
