import type { SubmitCustomerProfileResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { v2AuthKeys } from "../../auth/auth.queries";
import { rentalCustomerKeys } from "../rental-customer.queries";
import {
	type SubmitCustomerProfileVariables,
	submitCustomerProfile,
} from "./submit-customer-profile.api";

type SubmitCustomerProfileOptions = Omit<
	MutationOptions<
		SubmitCustomerProfileResponseDto,
		ProblemDetailsError,
		SubmitCustomerProfileVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useSubmitCustomerProfile(
	options?: SubmitCustomerProfileOptions,
) {
	return useMutation<
		SubmitCustomerProfileResponseDto,
		ProblemDetailsError,
		SubmitCustomerProfileVariables
	>({
		...options,
		mutationFn: submitCustomerProfile,
		meta: {
			invalidates: [v2AuthKeys.currentUser(), rentalCustomerKeys.all()],
			...options?.meta,
		},
	});
}
