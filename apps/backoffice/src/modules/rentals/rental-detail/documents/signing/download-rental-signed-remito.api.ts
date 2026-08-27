import {
	DownloadRentalSignedRemitoParamsSchema,
	type DownloadRentalSignedRemitoResponseDto,
	DownloadRentalSignedRemitoResponseSchema,
	downloadRentalSignedRemitoContract,
	problemDetailsSchema,
} from "@repo/api-contracts";
import { getBackendApiBaseUrl } from "@/lib/api/backend-api-url";
import { getForwardedCookieHeader } from "@/lib/api/request-context";
import { ProblemDetailsError } from "@/shared/errors";

export type RentalSignedRemitoDownloadResponse = {
	blob: DownloadRentalSignedRemitoResponseDto;
	contentDisposition: string | null;
};

export async function downloadRentalSignedRemito(
	rentalId: string,
): Promise<RentalSignedRemitoDownloadResponse> {
	const parsedParams = DownloadRentalSignedRemitoParamsSchema.parse({
		rentalId,
	});
	const path = downloadRentalSignedRemitoContract.path.replace(
		":rentalId",
		encodeURIComponent(parsedParams.rentalId),
	);
	const isServer = typeof window === "undefined";
	const headers = new Headers();

	if (isServer) {
		const cookie = getForwardedCookieHeader();
		if (cookie) headers.set("cookie", cookie);
	}

	let response: Response;

	try {
		response = await fetch(`${getBackendApiBaseUrl()}${path}`, {
			method: downloadRentalSignedRemitoContract.method,
			headers,
			credentials: isServer ? undefined : "include",
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
		const raw = await response.json().catch(() => null);
		const parsed = problemDetailsSchema.safeParse(raw);

		throw new ProblemDetailsError(
			parsed.success
				? parsed.data
				: {
						type: "about:blank",
						title: response.statusText || "Request Failed",
						status: response.status,
						detail: `Request to ${path} failed with status ${response.status}`,
					},
		);
	}

	return {
		blob: DownloadRentalSignedRemitoResponseSchema.parse(await response.blob()),
		contentDisposition: response.headers.get("Content-Disposition"),
	};
}
