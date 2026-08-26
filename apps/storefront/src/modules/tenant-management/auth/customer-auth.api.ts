import {
	type CustomerLoginBodyDto,
	CustomerLoginBodySchema,
	type CustomerLoginResponseDto,
	CustomerLoginResponseSchema,
	customerLoginContract,
	customerLogoutContract,
	type GetCurrentCustomerResponseDto,
	GetCurrentCustomerResponseSchema,
	getCurrentCustomerContract,
} from "@repo/api-contracts";
import { getProblemDetailsStatus } from "@/shared/errors";
import { getCustomerCsrfToken, setCustomerCsrfToken } from "./csrf-token";
import { sessionBrowserApiFetch } from "./session-browser-api";

export async function loginCustomer(
	body: CustomerLoginBodyDto,
): Promise<CustomerLoginResponseDto> {
	const data = await sessionBrowserApiFetch(customerLoginContract.path, {
		method: customerLoginContract.method,
		headers: { "content-type": "application/json" },
		body: JSON.stringify(CustomerLoginBodySchema.parse(body)),
	});
	const response = CustomerLoginResponseSchema.parse(data);
	setCustomerCsrfToken(response.csrfToken);
	return response;
}

export async function getCurrentCustomer(): Promise<GetCurrentCustomerResponseDto | null> {
	try {
		const data = await sessionBrowserApiFetch(getCurrentCustomerContract.path, {
			method: getCurrentCustomerContract.method,
		});
		return GetCurrentCustomerResponseSchema.parse(data);
	} catch (error) {
		if ([401, 403].includes(getProblemDetailsStatus(error) ?? 0)) return null;
		throw error;
	}
}

export async function logoutCustomer(): Promise<void> {
	const csrfToken = await getCustomerCsrfToken();
	await sessionBrowserApiFetch(customerLogoutContract.path, {
		method: customerLogoutContract.method,
		headers: { "x-csrf-token": csrfToken },
	});
	setCustomerCsrfToken(null);
}
