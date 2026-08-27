import type { ReplaceConfirmedRentalAssetResponseDto } from "@repo/api-contracts";
import { type MutationOptions, useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { contractKeys } from "../documents/signing/rental-contract-signing.queries";
import {
	type ReplaceAssignedAssetVariables,
	replaceAssignedAsset,
} from "./replace-assigned-asset.api";

type ReplaceAssignedAssetOptions = Omit<
	MutationOptions<
		ReplaceConfirmedRentalAssetResponseDto,
		ProblemDetailsError,
		ReplaceAssignedAssetVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useReplaceAssignedAsset(options?: ReplaceAssignedAssetOptions) {
	return useMutation({
		...options,
		mutationFn: replaceAssignedAsset,
		meta: {
			invalidates: (variables: ReplaceAssignedAssetVariables) => [
				rentalKeys.all(),
				contractKeys.rentalSigningSummary(variables.rentalId),
			],
			...options?.meta,
		},
	});
}
