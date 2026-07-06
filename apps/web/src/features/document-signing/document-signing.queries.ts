import type {
	GetPublicSigningSessionResponseDto,
	ResolvePublicSigningSessionQueryDto,
	ResolvePublicSigningSessionResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type GetPublicSigningSessionVariables,
	getPublicSigningSession,
} from "./get-public-signing-session/get-public-signing-session.api";
import { resolvePublicSigningSession } from "./resolve-public-signing-session/resolve-public-signing-session.api";

export const documentSigningKeys = {
	all: () => ["v2", "document-signing"] as const,
	orders: () => [...documentSigningKeys.all(), "orders"] as const,
	order: (orderId: string) =>
		[...documentSigningKeys.orders(), orderId] as const,
	sessions: (orderId: string) =>
		[...documentSigningKeys.order(orderId), "sessions"] as const,
	public: () => [...documentSigningKeys.all(), "public"] as const,
	publicSession: (token?: string) =>
		[...documentSigningKeys.public(), "session", token ?? ""] as const,
	resolvePublicSession: (query?: ResolvePublicSigningSessionQueryDto) =>
		[...documentSigningKeys.public(), "resolve", query ?? {}] as const,
};

type DocumentSigningQueryOverrides<TResponse, TData> = Omit<
	UseQueryOptions<TResponse, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const documentSigningQueries = {
	publicSession: <TData = GetPublicSigningSessionResponseDto>(
		variables: GetPublicSigningSessionVariables,
		overrides?: DocumentSigningQueryOverrides<
			GetPublicSigningSessionResponseDto,
			TData
		>,
	) =>
		queryOptions<
			GetPublicSigningSessionResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: documentSigningKeys.publicSession(variables.token),
			queryFn: () => getPublicSigningSession(variables),
			...overrides,
		}),
	resolvePublicSession: <TData = ResolvePublicSigningSessionResponseDto>(
		query?: ResolvePublicSigningSessionQueryDto,
		overrides?: DocumentSigningQueryOverrides<
			ResolvePublicSigningSessionResponseDto,
			TData
		>,
	) =>
		queryOptions<
			ResolvePublicSigningSessionResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: documentSigningKeys.resolvePublicSession(query),
			queryFn: () => resolvePublicSigningSession(query),
			...overrides,
		}),
};

export function usePublicSigningSession<
	TData = GetPublicSigningSessionResponseDto,
>(
	variables: GetPublicSigningSessionVariables,
	overrides?: DocumentSigningQueryOverrides<
		GetPublicSigningSessionResponseDto,
		TData
	>,
) {
	return useQuery(documentSigningQueries.publicSession(variables, overrides));
}

export function useResolvePublicSigningSession<
	TData = ResolvePublicSigningSessionResponseDto,
>(
	query?: ResolvePublicSigningSessionQueryDto,
	overrides?: DocumentSigningQueryOverrides<
		ResolvePublicSigningSessionResponseDto,
		TData
	>,
) {
	return useQuery(
		documentSigningQueries.resolvePublicSession(query, overrides),
	);
}
