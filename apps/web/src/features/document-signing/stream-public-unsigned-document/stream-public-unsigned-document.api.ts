import {
	StreamPublicUnsignedDocumentQuerySchema,
	streamPublicUnsignedDocumentContract,
} from "@repo/api-contracts";
import { getForwardedCookieHeader } from "@/lib/api/request-context";

export function getPublicSigningUnsignedPdfUrl(token: string): string {
	const parsedQuery = StreamPublicUnsignedDocumentQuerySchema.parse({ token });
	const searchParams = new URLSearchParams({ token: parsedQuery.token ?? "" });

	return `/api/document-signing/public/unsigned-pdf?${searchParams.toString()}`;
}

function createPdfProxyProblem(status: number, fallbackMessage: string) {
	return new Error(`${status}: ${fallbackMessage}`);
}

export async function fetchPublicSigningUnsignedPdfResponse(token: string) {
	const parsedQuery = StreamPublicUnsignedDocumentQuerySchema.parse({ token });

	let response: Response;

	try {
		const headers = new Headers({
			Authorization: `Bearer ${parsedQuery.token}`,
		});
		const cookie = getForwardedCookieHeader();

		if (cookie) {
			headers.set("cookie", cookie);
		}

		response = await fetch(
			`${process.env.API_BASE_URL ?? "http://localhost:3000"}${streamPublicUnsignedDocumentContract.path}`,
			{
				method: streamPublicUnsignedDocumentContract.method,
				headers,
			},
		);
	} catch (error) {
		throw createPdfProxyProblem(
			0,
			error instanceof Error
				? error.message
				: "No pudimos cargar el PDF para firma.",
		);
	}

	if (!response.ok) {
		const raw = await response.json().catch(() => null);
		const detail =
			raw &&
			typeof raw === "object" &&
			"detail" in raw &&
			typeof raw.detail === "string"
				? raw.detail
				: raw &&
						typeof raw === "object" &&
						"message" in raw &&
						typeof raw.message === "string"
					? raw.message
					: "No pudimos cargar el PDF para firma.";

		throw createPdfProxyProblem(response.status, detail);
	}

	return response;
}
