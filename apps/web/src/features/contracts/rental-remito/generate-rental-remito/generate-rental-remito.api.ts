import {
	downloadRentalRemitoContract,
	GenerateRentalRemitoParamsSchema,
	type GenerateRentalRemitoResponseDto,
	GenerateRentalRemitoResponseSchema,
	generateRentalRemitoContract,
} from "@repo/api-contracts";
import { problemDetailsSchema } from "@repo/schemas";
import { getForwardedCookieHeader } from "@/lib/api/request-context";
import { ProblemDetailsError } from "@/shared/errors";

const SERVER_API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
const BROWSER_API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export type RentalRemitoPdfResponse = {
	blob: GenerateRentalRemitoResponseDto;
	contentDisposition: string | null;
	contentType: string | null;
};

async function fetchRentalRemitoPdf(
	path: string,
): Promise<RentalRemitoPdfResponse> {
	const isServer = typeof window === "undefined";
	const baseUrl = isServer ? SERVER_API_BASE_URL : BROWSER_API_BASE_URL;
	const headers = new Headers();

	if (isServer) {
		const cookie = getForwardedCookieHeader();

		if (cookie) {
			headers.set("cookie", cookie);
		}
	}

	let response: Response;

	try {
		response = await fetch(`${baseUrl}${path}`, {
			method: generateRentalRemitoContract.method,
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

	const blob = GenerateRentalRemitoResponseSchema.parse(await response.blob());

	return {
		blob,
		contentDisposition: response.headers.get("Content-Disposition"),
		contentType: response.headers.get("Content-Type"),
	};
}

function rentalRemitoPath(pathTemplate: string, rentalId: string): string {
	const parsedParams = GenerateRentalRemitoParamsSchema.parse({ rentalId });

	return pathTemplate.replace(
		":rentalId",
		encodeURIComponent(parsedParams.rentalId),
	);
}

export function generateRentalRemito(
	rentalId: string,
): Promise<RentalRemitoPdfResponse> {
	return fetchRentalRemitoPdf(
		rentalRemitoPath(generateRentalRemitoContract.path, rentalId),
	);
}

export function downloadRentalRemito(
	rentalId: string,
): Promise<RentalRemitoPdfResponse> {
	return fetchRentalRemitoPdf(
		rentalRemitoPath(downloadRentalRemitoContract.path, rentalId),
	);
}
