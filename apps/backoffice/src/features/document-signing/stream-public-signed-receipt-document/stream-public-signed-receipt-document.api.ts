import {
	StreamPublicSignedReceiptDocumentQuerySchema,
	streamPublicSignedReceiptDocumentContract,
} from "@repo/api-contracts";
import { getBackendApiBaseUrl } from "@/lib/api/backend-api-url";
import { getForwardedCookieHeader } from "@/lib/api/request-context";

export function getPublicSigningSignedPdfUrl(token: string): string {
	const parsedQuery = StreamPublicSignedReceiptDocumentQuerySchema.parse({
		token,
	});
	const searchParams = new URLSearchParams({ token: parsedQuery.token ?? "" });

	return `/api/document-signing/public/signed-pdf?${searchParams.toString()}`;
}

export function getPublicSigningSignedPdfUrlFromDownloadUrl(
	downloadUrl: string,
): string {
	const url = new URL(downloadUrl, "http://localhost");
	const token = url.searchParams.get("token") ?? "";

	return getPublicSigningSignedPdfUrl(token);
}

function createPdfProxyProblem(status: number, fallbackMessage: string) {
	return new Error(`${status}: ${fallbackMessage}`);
}

export async function fetchPublicSigningSignedPdfResponse(token: string) {
	const parsedQuery = StreamPublicSignedReceiptDocumentQuerySchema.parse({
		token,
	});
	const headers = new Headers();
	const cookie = getForwardedCookieHeader();

	if (cookie) {
		headers.set("cookie", cookie);
	}

	const searchParams = new URLSearchParams({
		token: parsedQuery.token ?? "",
	});
	const url = new URL(
		streamPublicSignedReceiptDocumentContract.path,
		getBackendApiBaseUrl(),
	);
	url.search = searchParams.toString();

	try {
		return await fetch(url, {
			method: streamPublicSignedReceiptDocumentContract.method,
			headers,
		});
	} catch (error) {
		throw createPdfProxyProblem(
			0,
			error instanceof Error
				? error.message
				: "No pudimos descargar el PDF firmado.",
		);
	}
}
