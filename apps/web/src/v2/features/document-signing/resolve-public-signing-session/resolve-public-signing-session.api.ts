import {
	type ResolvePublicSigningSessionQueryDto,
	ResolvePublicSigningSessionQuerySchema,
	type ResolvePublicSigningSessionResponseDto,
	ResolvePublicSigningSessionResponseSchema,
	resolvePublicSigningSessionContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/v2/lib/api/api-fetch";

export async function resolvePublicSigningSession(
	query?: ResolvePublicSigningSessionQueryDto,
): Promise<ResolvePublicSigningSessionResponseDto> {
	const parsedQuery = ResolvePublicSigningSessionQuerySchema.parse(query ?? {});
	const searchParams = new URLSearchParams();

	if (parsedQuery.token !== undefined) {
		searchParams.set("token", parsedQuery.token);
	}

	const path = searchParams.size
		? `${resolvePublicSigningSessionContract.path}?${searchParams.toString()}`
		: resolvePublicSigningSessionContract.path;

	const response = await apiFetch(path, {
		method: resolvePublicSigningSessionContract.method,
	});

	return ResolvePublicSigningSessionResponseSchema.parse(response);
}
