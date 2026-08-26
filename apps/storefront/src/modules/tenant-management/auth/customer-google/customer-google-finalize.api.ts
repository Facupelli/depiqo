import {
	CustomerGoogleFinalizeBodySchema,
	CustomerGoogleFinalizeResponseSchema,
	customerGoogleFinalizeContract,
} from "@repo/api-contracts";
import { setCustomerCsrfToken } from "../csrf-token";
import { sessionBrowserApiFetch } from "../session-browser-api";

export async function finalizeCustomerGoogleLogin(ticket: string) {
	const data = await sessionBrowserApiFetch(
		customerGoogleFinalizeContract.path,
		{
			method: customerGoogleFinalizeContract.method,
			headers: { "content-type": "application/json" },
			body: JSON.stringify(CustomerGoogleFinalizeBodySchema.parse({ ticket })),
		},
	);
	const response = CustomerGoogleFinalizeResponseSchema.parse(data);
	setCustomerCsrfToken(response.csrfToken);
	return response;
}
