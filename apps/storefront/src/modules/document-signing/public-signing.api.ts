import {
	type AcceptPublicSigningSessionBodyDto,
	AcceptPublicSigningSessionBodySchema,
	type AcceptPublicSigningSessionResponseDto,
	AcceptPublicSigningSessionResponseSchema,
	acceptPublicSigningSessionContract,
	GetCsrfTokenResponseSchema,
	type GetPublicSigningSessionResponseDto,
	GetPublicSigningSessionResponseSchema,
	getPublicSigningSessionContract,
} from "@repo/api-contracts";
import { problemDetailsSchema } from "@repo/schemas";
import { z } from "zod";
import { ProblemDetailsError } from "@/shared/errors";
import type { PublicSigningToken } from "./public-signing-token";

const PUBLIC_SIGNING_BFF_PREFIX = "/public-signing";
const envelopeSchema = z.object({ data: z.unknown() });

export async function getPublicSigningSession(
	token: PublicSigningToken,
): Promise<GetPublicSigningSessionResponseDto> {
	const response = await publicSigningApiFetch(
		getPublicSigningSessionContract.path,
		{
			method: getPublicSigningSessionContract.method,
			headers: { authorization: `Bearer ${token}` },
		},
	);

	return GetPublicSigningSessionResponseSchema.parse(response);
}

export async function acceptPublicSigningSession({
	token,
	body,
}: {
	token: PublicSigningToken;
	body: AcceptPublicSigningSessionBodyDto;
}): Promise<AcceptPublicSigningSessionResponseDto> {
	const csrfToken = await getPublicSigningCsrfToken();
	const response = await publicSigningApiFetch(
		acceptPublicSigningSessionContract.path,
		{
			method: acceptPublicSigningSessionContract.method,
			headers: {
				authorization: `Bearer ${token}`,
				"content-type": "application/json",
				"x-csrf-token": csrfToken,
			},
			body: JSON.stringify(AcceptPublicSigningSessionBodySchema.parse(body)),
		},
	);

	return AcceptPublicSigningSessionResponseSchema.parse(response);
}

async function getPublicSigningCsrfToken(): Promise<string> {
	const response = await publicSigningApiFetch("/csrf", { method: "GET" });

	return GetCsrfTokenResponseSchema.parse(response).csrfToken;
}

async function publicSigningApiFetch(
	path: string,
	init?: RequestInit,
): Promise<unknown | null> {
	let response: Response;

	try {
		response = await fetch(`${PUBLIC_SIGNING_BFF_PREFIX}${path}`, {
			...init,
			credentials: "include",
		});
	} catch (error) {
		throw new ProblemDetailsError({
			type: "about:blank",
			title: "Network Error",
			status: 0,
			detail:
				error instanceof Error
					? error.message
					: "An unexpected network error occurred",
		});
	}

	if (!response.ok) {
		const problem = problemDetailsSchema.safeParse(
			await response.json().catch(() => null),
		);
		throw new ProblemDetailsError(
			problem.success
				? problem.data
				: {
						type: "about:blank",
						title: response.statusText || "Request Failed",
						status: response.status,
						detail: `Public signing request failed with status ${response.status}`,
					},
		);
	}

	if (response.status === 204) return null;

	const body = await response.json();
	return envelopeSchema.parse(body).data;
}
