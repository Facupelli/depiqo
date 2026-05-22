import type { ProblemDetails } from "@repo/schemas";
import {
	queryOptions,
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import type { Dayjs } from "dayjs";
import { orderKeys } from "@/features/orders/orders.keys";
import { parseTimestamp } from "@/lib/dates/parse";
import { ProblemDetailsError } from "@/shared/errors";
import {
	acceptPublicSigningSession,
	createOrderSigningSession,
	getPublicSigningSession,
	resolvePublicSigningSession,
} from "./document-signing.api";
import type {
	AcceptPublicSigningSessionDto,
	AcceptPublicSigningSessionResponseDto,
	DocumentSigningTokenInput,
	OrderSigningSessionParams,
	OrderSigningSessionResponseDto,
	PublicSigningSessionResolveResponseDto,
	PublicSigningSessionResponseDto,
	SendOrderSigningInvitationDto,
} from "./document-signing.schema";

export type ParsedOrderSigningSessionResponseDto = Omit<
	OrderSigningSessionResponseDto,
	"expiresAt"
> & {
	expiresAt: Dayjs;
};

export type ParsedPublicSigningSessionResponseDto = Omit<
	PublicSigningSessionResponseDto,
	"expiresAt"
> & {
	expiresAt: Dayjs;
};

export type ParsedAcceptPublicSigningSessionResponseDto = Omit<
	AcceptPublicSigningSessionResponseDto,
	"signedAt"
> & {
	signedAt: Dayjs;
};

export const documentSigningKeys = {
	all: () => ["document-signing"] as const,
	publicSessions: () =>
		[...documentSigningKeys.all(), "public-sessions"] as const,
	publicResolve: (token: string) =>
		[...documentSigningKeys.publicSessions(), "resolve", token] as const,
	publicSession: (token: string) =>
		[...documentSigningKeys.publicSessions(), "me", token] as const,
	orderSessions: () =>
		[...documentSigningKeys.all(), "order-sessions"] as const,
	orderSession: (orderId: string) =>
		[...documentSigningKeys.orderSessions(), orderId] as const,
};

type ResolvePublicSigningSessionOptions<
	TData = PublicSigningSessionResolveResponseDto,
> = Omit<
	UseQueryOptions<
		PublicSigningSessionResolveResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

type PublicSigningSessionOptions<
	TData = ParsedPublicSigningSessionResponseDto,
> = Omit<
	UseQueryOptions<PublicSigningSessionResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

type CreateOrderSigningSessionMutationOptions = Omit<
	UseMutationOptions<
		ParsedOrderSigningSessionResponseDto,
		ProblemDetailsError,
		{
			params: OrderSigningSessionParams;
			dto: SendOrderSigningInvitationDto;
		}
	>,
	"mutationFn"
>;

type AcceptPublicSigningSessionMutationOptions = Omit<
	UseMutationOptions<
		ParsedAcceptPublicSigningSessionResponseDto,
		ProblemDetailsError,
		{
			token: string;
			dto: AcceptPublicSigningSessionDto;
		}
	>,
	"mutationFn"
>;

export const documentSigningQueries = {
	resolvePublicSession: <TData = PublicSigningSessionResolveResponseDto>(
		params: DocumentSigningTokenInput,
		options?: ResolvePublicSigningSessionOptions<TData>,
	) =>
		queryOptions<
			PublicSigningSessionResolveResponseDto,
			ProblemDetailsError,
			TData
		>({
			...options,
			queryKey: documentSigningKeys.publicResolve(params.token),
			queryFn: () => resolvePublicSigningSession({ data: params }),
		}),
	publicSession: <TData = ParsedPublicSigningSessionResponseDto>(
		params: DocumentSigningTokenInput,
		options?: PublicSigningSessionOptions<TData>,
	) =>
		queryOptions<PublicSigningSessionResponseDto, ProblemDetailsError, TData>({
			...options,
			queryKey: documentSigningKeys.publicSession(params.token),
			queryFn: () => getPublicSigningSession({ data: params }),
			select: (raw) => {
				const parsed = parsePublicSigningSessionResponse(raw);
				return options?.select ? options.select(raw) : (parsed as TData);
			},
		}),
};

export function useResolvePublicSigningSession<
	TData = PublicSigningSessionResolveResponseDto,
>(
	params: DocumentSigningTokenInput,
	options?: ResolvePublicSigningSessionOptions<TData>,
) {
	return useQuery({
		...documentSigningQueries.resolvePublicSession(params, options),
	});
}

export function usePublicSigningSession<
	TData = ParsedPublicSigningSessionResponseDto,
>(
	params: DocumentSigningTokenInput,
	options?: PublicSigningSessionOptions<TData>,
) {
	return useQuery({
		...documentSigningQueries.publicSession(params, options),
	});
}

export function useCreateOrderSigningSession(
	options?: CreateOrderSigningSessionMutationOptions,
) {
	return useMutation<
		ParsedOrderSigningSessionResponseDto,
		ProblemDetailsError,
		{
			params: OrderSigningSessionParams;
			dto: SendOrderSigningInvitationDto;
		}
	>({
		...options,
		mutationFn: async (data) => {
			const result = await createOrderSigningSession({ data });

			if (hasMutationError(result)) {
				throw new ProblemDetailsError(result.error);
			}

			return parseOrderSigningSessionResponse(result);
		},
		meta: {
			invalidates: (variables: any) => [
				documentSigningKeys.orderSession(variables.params.orderId),
				orderKeys.detail({ orderId: variables.params.orderId }),
			],
		},
	});
}

export function useAcceptPublicSigningSession(
	options?: AcceptPublicSigningSessionMutationOptions,
) {
	return useMutation<
		ParsedAcceptPublicSigningSessionResponseDto,
		ProblemDetailsError,
		{
			token: string;
			dto: AcceptPublicSigningSessionDto;
		}
	>({
		...options,
		mutationFn: async (data) =>
			parseAcceptPublicSigningSessionResponse(
				await acceptPublicSigningSession({ data }),
			),
		meta: {
			invalidates: (variables: any) =>
				documentSigningKeys.publicSession(variables.token),
		},
	});
}

function parseOrderSigningSessionResponse(
	raw: OrderSigningSessionResponseDto,
): ParsedOrderSigningSessionResponseDto {
	return {
		...raw,
		expiresAt: requireDayjs(parseTimestamp(raw.expiresAt), "expiresAt"),
	};
}

function parsePublicSigningSessionResponse(
	raw: PublicSigningSessionResponseDto,
): ParsedPublicSigningSessionResponseDto {
	return {
		...raw,
		expiresAt: requireDayjs(parseTimestamp(raw.expiresAt), "expiresAt"),
	};
}

function parseAcceptPublicSigningSessionResponse(
	raw: AcceptPublicSigningSessionResponseDto,
): ParsedAcceptPublicSigningSessionResponseDto {
	return {
		...raw,
		signedAt: requireDayjs(parseTimestamp(raw.signedAt), "signedAt"),
	};
}

function requireDayjs(value: Dayjs | null, field: string): Dayjs {
	if (!value) {
		throw new Error(`Invalid document signing date: ${field}`);
	}

	return value;
}

function hasMutationError(
	result: unknown,
): result is { error: ProblemDetails } {
	return typeof result === "object" && result !== null && "error" in result;
}
