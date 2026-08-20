import { problemDetailsSchema } from "@repo/api-contracts";
import { ProblemDetailsError } from "@/shared/errors";
import type { PublicSigningReceiptToken } from "./public-signing-receipt-token";
import type { PublicSigningToken } from "./public-signing-token";

const PUBLIC_SIGNING_BFF_PREFIX = "/public-signing";

export async function fetchUnsignedSigningDocument(
	token: PublicSigningToken,
	signal?: AbortSignal,
): Promise<Blob> {
	return fetchSigningDocument(
		"/document-signing/public/sessions/me/unsigned-pdf",
		token,
		signal,
	);
}

export async function fetchSignedReceiptDocument(
	token: PublicSigningReceiptToken,
	signal?: AbortSignal,
): Promise<Blob> {
	return fetchSigningDocument(
		"/document-signing/public/receipts/signed-pdf",
		token,
		signal,
	);
}

async function fetchSigningDocument(
	path: string,
	capability: string,
	signal?: AbortSignal,
): Promise<Blob> {
	let response: Response;

	try {
		response = await fetch(`${PUBLIC_SIGNING_BFF_PREFIX}${path}`, {
			method: "GET",
			headers: { authorization: `Bearer ${capability}` },
			credentials: "include",
			signal,
		});
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			throw error;
		}
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
						title: response.statusText || "Document request failed",
						status: response.status,
						detail: `Document request failed with status ${response.status}`,
					},
		);
	}

	return response.blob();
}
