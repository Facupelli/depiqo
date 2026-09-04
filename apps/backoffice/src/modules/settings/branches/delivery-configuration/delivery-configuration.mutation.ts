import type { PutBranchDeliveryConfigurationResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	type PutDeliveryConfigurationVariables,
	putDeliveryConfiguration,
} from "./delivery-configuration.api";
import { deliveryConfigurationKeys } from "./delivery-configuration.queries";

type PutDeliveryConfigurationOptions = Omit<
	MutationOptions<
		PutBranchDeliveryConfigurationResponseDto,
		ProblemDetailsError,
		PutDeliveryConfigurationVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function usePutDeliveryConfiguration(
	options?: PutDeliveryConfigurationOptions,
) {
	return useMutation({
		...options,
		mutationFn: putDeliveryConfiguration,
		meta: {
			invalidates: (variables: PutDeliveryConfigurationVariables) =>
				deliveryConfigurationKeys.detail(variables.branchId),
			...options?.meta,
		},
	});
}
