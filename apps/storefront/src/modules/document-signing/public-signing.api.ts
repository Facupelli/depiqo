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
import { problemDetailsSchema } from "@repo/api-contracts";
import { z } from "zod";
import { ProblemDetailsError } from "@/shared/errors";
import {
	type PublicSigningReceiptToken,
	PublicSigningReceiptTokenSchema,
} from "./public-signing-receipt-token";
import type { PublicSigningToken } from "./public-signing-token";

export type PublicSigningAcceptanceResult = Omit<
	AcceptPublicSigningSessionResponseDto,
	"downloadUrl"
> & {
	receiptToken: PublicSigningReceiptToken;
};

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
}): Promise<PublicSigningAcceptanceResult> {
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

	return toPublicSigningAcceptanceResult(
		AcceptPublicSigningSessionResponseSchema.parse(response),
	);
}

function toPublicSigningAcceptanceResult(
	response: AcceptPublicSigningSessionResponseDto,
): PublicSigningAcceptanceResult {
	let url: URL;
	try {
		url = new URL(response.downloadUrl, "https://backend.invalid");
	} catch {
		throw invalidReceiptDownloadUrlError();
	}

	const tokenEntries = [...url.searchParams.entries()];
	const token =
		response.downloadUrl.startsWith("/") &&
		url.origin === "https://backend.invalid" &&
		url.pathname === "/document-signing/public/receipts/signed-pdf" &&
		url.hash === "" &&
		tokenEntries.length === 1 &&
		tokenEntries[0]?.[0] === "token"
			? PublicSigningReceiptTokenSchema.safeParse(tokenEntries[0][1])
			: null;

	if (!token?.success) throw invalidReceiptDownloadUrlError();

	const { downloadUrl: _downloadUrl, ...result } = response;
	return { ...result, receiptToken: token.data };
}

function invalidReceiptDownloadUrlError(): ProblemDetailsError {
	return new ProblemDetailsError({
		type: "about:blank",
		title: "Invalid receipt download URL",
		status: 502,
		detail: "The signing service returned an invalid receipt download URL.",
	});
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
