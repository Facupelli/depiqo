import type {
	AcceptPublicSigningSessionBodyDto,
	GetPublicSigningSessionResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	acceptPublicSigningSession,
	getPublicSigningSession,
	type PublicSigningAcceptanceResult,
} from "./public-signing.api";
import { fetchUnsignedSigningDocument } from "./public-signing-document.api";
import type { PublicSigningToken } from "./public-signing-token";

export const publicSigningKeys = {
	all: () => ["storefront", "document-signing", "public"] as const,
	session: (token: PublicSigningToken) =>
		[...publicSigningKeys.all(), "session", fingerprintToken(token)] as const,
	unsignedDocument: (requestId: string) =>
		[...publicSigningKeys.all(), "unsigned-document", requestId] as const,
};

type PublicSigningSessionQueryOptions<
	TData = GetPublicSigningSessionResponseDto,
> = Omit<
	UseQueryOptions<
		GetPublicSigningSessionResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export const publicSigningQueries = {
	session: <TData = GetPublicSigningSessionResponseDto>(
		token: PublicSigningToken,
		overrides?: PublicSigningSessionQueryOptions<TData>,
	) =>
		queryOptions<
			GetPublicSigningSessionResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: publicSigningKeys.session(token),
			queryFn: () => getPublicSigningSession(token),
			...overrides,
		}),
	unsignedDocument: (token: PublicSigningToken, requestId?: string) =>
		queryOptions<Blob, ProblemDetailsError>({
			queryKey: publicSigningKeys.unsignedDocument(requestId ?? "pending"),
			queryFn: ({ signal }) => fetchUnsignedSigningDocument(token, signal),
			enabled: Boolean(requestId),
			gcTime: 0,
			retry: false,
		}),
};

export function usePublicSigningSession(
	token: PublicSigningToken,
	overrides?: PublicSigningSessionQueryOptions,
) {
	return useQuery(publicSigningQueries.session(token, overrides));
}

export function useUnsignedSigningDocument(
	token: PublicSigningToken,
	requestId?: string,
) {
	return useQuery(publicSigningQueries.unsignedDocument(token, requestId));
}

export function useAcceptPublicSigningSession() {
	return useMutation<
		PublicSigningAcceptanceResult,
		ProblemDetailsError,
		{
			token: PublicSigningToken;
			body: AcceptPublicSigningSessionBodyDto;
		}
	>({
		mutationFn: acceptPublicSigningSession,
	});
}

function fingerprintToken(token: PublicSigningToken): string {
	let hash = 0xcbf29ce484222325n;

	for (let index = 0; index < token.length; index += 1) {
		hash ^= BigInt(token.charCodeAt(index));
		hash = BigInt.asUintN(64, hash * 0x100000001b3n);
	}

	return hash.toString(16).padStart(16, "0");
}
