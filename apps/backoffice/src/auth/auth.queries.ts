import { queryOptions } from "@tanstack/react-query";
import { getCurrentUser } from "./get-current-user/get-current-user.api";

export const v2AuthKeys = {
	all: () => ["v2", "tenant-management", "auth"] as const,
	current: () => [...v2AuthKeys.all(), "current"] as const,
};

export const currentAuthQueries = {
	current: () =>
		queryOptions({
			queryKey: v2AuthKeys.current(),
			queryFn: getCurrentUser,
			staleTime: 60_000,
		}),
};
