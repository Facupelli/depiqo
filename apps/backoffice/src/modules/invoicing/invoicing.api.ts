import {
	type CorrectInvoiceRegistrationBodyDto,
	type CorrectInvoiceRegistrationResponseDto,
	correctInvoiceRegistrationContract,
	type GetInvoiceQueryDto,
	type GetInvoiceResponseDto,
	type GetRentalInvoicesQueryDto,
	type GetRentalInvoicesResponseDto,
	getInvoiceContract,
	getRentalInvoicesContract,
	type RegisterExternalInvoiceBodyDto,
	type RegisterExternalInvoiceResponseDto,
	type RemoveInvoiceRegistrationQueryDto,
	registerExternalInvoiceContract,
	removeInvoiceRegistrationContract,
} from "@repo/api-contracts";
import { apiFetch } from "@/lib/api/api-fetch";

export type CorrectInvoiceRegistrationVariables = {
	invoiceId: string;
	body: CorrectInvoiceRegistrationBodyDto;
};

export type RemoveInvoiceRegistrationVariables = {
	invoiceId: string;
	query: RemoveInvoiceRegistrationQueryDto;
};

export async function registerExternalInvoice(
	body: RegisterExternalInvoiceBodyDto,
): Promise<RegisterExternalInvoiceResponseDto> {
	const parsedBody = registerExternalInvoiceContract.body.parse(body);
	const response = await apiFetch(registerExternalInvoiceContract.path, {
		method: registerExternalInvoiceContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});
	return registerExternalInvoiceContract.response.parse(response);
}

export async function getRentalInvoices(
	input: GetRentalInvoicesQueryDto,
	signal?: AbortSignal,
): Promise<GetRentalInvoicesResponseDto> {
	const query = getRentalInvoicesContract.query.parse(input);
	const search = new URLSearchParams({
		rentalId: query.rentalId,
		includeRemoved: String(query.includeRemoved),
	});
	const response = await apiFetch(
		`${getRentalInvoicesContract.path}?${search}`,
		{ method: getRentalInvoicesContract.method, signal },
	);
	return getRentalInvoicesContract.response.parse(response);
}

export async function getInvoice(
	invoiceId: string,
	input: GetInvoiceQueryDto = { includeRemoved: false },
	signal?: AbortSignal,
): Promise<GetInvoiceResponseDto> {
	const params = getInvoiceContract.params.parse({ invoiceId });
	const query = getInvoiceContract.query.parse(input);
	const path = getInvoiceContract.path.replace(
		":invoiceId",
		encodeURIComponent(params.invoiceId),
	);
	const search = new URLSearchParams({
		includeRemoved: String(query.includeRemoved),
	});
	const response = await apiFetch(`${path}?${search}`, {
		method: getInvoiceContract.method,
		signal,
	});
	return getInvoiceContract.response.parse(response);
}

export async function correctInvoiceRegistration({
	invoiceId,
	body,
}: CorrectInvoiceRegistrationVariables): Promise<CorrectInvoiceRegistrationResponseDto> {
	const params = correctInvoiceRegistrationContract.params.parse({ invoiceId });
	const parsedBody = correctInvoiceRegistrationContract.body.parse(body);
	const path = correctInvoiceRegistrationContract.path.replace(
		":invoiceId",
		encodeURIComponent(params.invoiceId),
	);
	const response = await apiFetch(path, {
		method: correctInvoiceRegistrationContract.method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(parsedBody),
	});
	return correctInvoiceRegistrationContract.response.parse(response);
}

export async function removeInvoiceRegistration({
	invoiceId,
	query,
}: RemoveInvoiceRegistrationVariables): Promise<void> {
	const params = removeInvoiceRegistrationContract.params.parse({ invoiceId });
	const parsedQuery = removeInvoiceRegistrationContract.query.parse(query);
	const path = removeInvoiceRegistrationContract.path.replace(
		":invoiceId",
		encodeURIComponent(params.invoiceId),
	);
	const search = new URLSearchParams({
		expectedVersion: String(parsedQuery.expectedVersion),
	});
	// apiFetch returns null for HTTP 204; there is no response body to parse.
	await apiFetch(`${path}?${search}`, {
		method: removeInvoiceRegistrationContract.method,
	});
}
