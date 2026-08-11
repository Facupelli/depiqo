import {
	type GetCurrentRentalCustomerProfileResponseDto,
	GetCurrentRentalCustomerProfileResponseSchema,
	getCurrentRentalCustomerProfileContract,
	type SubmitCustomerProfileBodyDto,
	SubmitCustomerProfileBodySchema,
	type SubmitCustomerProfileResponseDto,
	SubmitCustomerProfileResponseSchema,
	submitCustomerProfileContract,
} from "@repo/api-contracts";
import { ProblemDetailsError } from "@/shared/errors";
import { getCustomerCsrfToken } from "../auth/csrf-token";
import { sessionBrowserApiFetch } from "../auth/session-browser-api";

const CUSTOMER_PROFILE_NOT_FOUND_PROBLEM_TYPE =
	"https://api.depiqo.com/problems/tenant-management/customer-profile-not-found";
const CUSTOMER_PROFILE_NOT_FOUND_CODE =
	"tenant_management.customer_profile_not_found";

export type CurrentRentalCustomerProfile =
	GetCurrentRentalCustomerProfileResponseDto | null;

export type SubmitCustomerProfileVariables = {
	body: SubmitCustomerProfileBodyDto;
};

export async function getCurrentRentalCustomerProfile(): Promise<CurrentRentalCustomerProfile> {
	try {
		const response = await sessionBrowserApiFetch(
			getCurrentRentalCustomerProfileContract.path,
			{ method: getCurrentRentalCustomerProfileContract.method },
		);

		return GetCurrentRentalCustomerProfileResponseSchema.parse(response);
	} catch (error) {
		if (isCustomerProfileNotFoundError(error)) return null;
		throw error;
	}
}

export async function submitCustomerProfile({
	body,
}: SubmitCustomerProfileVariables): Promise<SubmitCustomerProfileResponseDto> {
	const response = await sessionBrowserApiFetch(
		submitCustomerProfileContract.path,
		{
			method: submitCustomerProfileContract.method,
			headers: {
				"content-type": "application/json",
				"x-csrf-token": await getCustomerCsrfToken(),
			},
			body: JSON.stringify(SubmitCustomerProfileBodySchema.parse(body)),
		},
	);

	return SubmitCustomerProfileResponseSchema.parse(response);
}

function isCustomerProfileNotFoundError(
	error: unknown,
): error is ProblemDetailsError {
	return (
		error instanceof ProblemDetailsError &&
		error.problemDetails.status === 404 &&
		error.problemDetails.type === CUSTOMER_PROFILE_NOT_FOUND_PROBLEM_TYPE &&
		error.problemDetails.code === CUSTOMER_PROFILE_NOT_FOUND_CODE
	);
}
