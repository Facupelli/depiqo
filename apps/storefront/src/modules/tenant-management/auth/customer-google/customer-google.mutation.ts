import type {
	CustomerGoogleStateBodyDto,
	CustomerGoogleStateResponseDto,
} from "@repo/api-contracts";
import { useMutation } from "@tanstack/react-query";
import { createCustomerGoogleState } from "./customer-google-state.function";

export function useCreateCustomerGoogleState() {
	return useMutation<
		CustomerGoogleStateResponseDto,
		Error,
		CustomerGoogleStateBodyDto
	>({
		mutationFn: (data) => createCustomerGoogleState({ data }),
	});
}
