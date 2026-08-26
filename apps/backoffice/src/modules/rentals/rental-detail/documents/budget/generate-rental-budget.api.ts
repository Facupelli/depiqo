import {
	type GenerateRentalBudgetBodyDto,
	GenerateRentalBudgetBodySchema,
	GenerateRentalBudgetParamsSchema,
	type GenerateRentalBudgetResponseDto,
	GenerateRentalBudgetResponseSchema,
	generateRentalBudgetContract,
	problemDetailsSchema,
} from "@repo/api-contracts";
import { getBackendApiBaseUrl } from "@/lib/api/backend-api-url";
import { getCsrfToken } from "@/lib/api/csrf-token";
import {
	getForwardedCookieHeader,
	getForwardedCsrfHeader,
} from "@/lib/api/request-context";
import { ProblemDetailsError } from "@/shared/errors";

export type RentalBudgetPdfResponse = {
	blob: GenerateRentalBudgetResponseDto;
	contentDisposition: string | null;
	contentType: string | null;
};

export async function generateRentalBudget(
	rentalId: string,
	body?: GenerateRentalBudgetBodyDto,
): Promise<RentalBudgetPdfResponse> {
	const parsedParams = GenerateRentalBudgetParamsSchema.parse({ rentalId });
	const parsedBody = GenerateRentalBudgetBodySchema.parse(body ?? {});
	const path = generateRentalBudgetContract.path.replace(
		":rentalId",
		encodeURIComponent(parsedParams.rentalId),
	);
	const isServer = typeof window === "undefined";
	const headers = new Headers({ "Content-Type": "application/json" });

	if (isServer) {
		const cookie = getForwardedCookieHeader();

		if (cookie) {
			headers.set("cookie", cookie);

			const csrfToken = getForwardedCsrfHeader();
			if (csrfToken) {
				headers.set("x-csrf-token", csrfToken);
			}
		}
	} else {
		headers.set("x-csrf-token", await getCsrfToken());
	}

	let response: Response;

	try {
		response = await fetch(`${getBackendApiBaseUrl()}${path}`, {
			method: generateRentalBudgetContract.method,
			headers,
			body: JSON.stringify(parsedBody),
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
		blob: GenerateRentalBudgetResponseSchema.parse(await response.blob()),
		contentDisposition: response.headers.get("Content-Disposition"),
		contentType: response.headers.get("Content-Type"),
	};
}
