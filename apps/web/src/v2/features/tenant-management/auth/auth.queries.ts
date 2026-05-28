import type { GetCurrentUserResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { getCurrentUser } from "./get-current-user/get-current-user.api";
// import { getCsrfToken } from "./csrf-token.client";

export type CurrentUserQueryOverrides<TData = GetCurrentUserResponseDto> = Omit<
	UseQueryOptions<GetCurrentUserResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export type CsrfTokenQueryOverrides<TData = string> = Omit<
	UseQueryOptions<string, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const v2AuthKeys = {
	all: () => ["v2", "tenant-management", "auth"] as const,
	currentUser: () => [...v2AuthKeys.all(), "current-user"] as const,
	csrfToken: () => [...v2AuthKeys.all(), "csrf-token"] as const,
};

export const authQueries = {
	currentUser: <TData = GetCurrentUserResponseDto>(
		overrides?: CurrentUserQueryOverrides<TData>,
	) =>
		queryOptions<GetCurrentUserResponseDto, ProblemDetailsError, TData>({
			queryKey: v2AuthKeys.currentUser(),
			queryFn: getCurrentUser,
			...overrides,
		}),
	// csrfToken: <TData = string>(overrides?: CsrfTokenQueryOverrides<TData>) =>
	// 	queryOptions<string, ProblemDetailsError, TData>({
	// 		queryKey: v2AuthKeys.csrfToken(),
	// 		queryFn: getCsrfToken,
	// 		staleTime: 0,
	// 		...overrides,
	// 	}),
};

export function useCurrentUser<TData = GetCurrentUserResponseDto>(
	overrides?: CurrentUserQueryOverrides<TData>,
) {
	return useQuery(authQueries.currentUser(overrides));
}

// export function useCsrfToken<TData = string>(
// 	overrides?: CsrfTokenQueryOverrides<TData>,
// ) {
// 	return useQuery(authQueries.csrfToken(overrides));
// }
