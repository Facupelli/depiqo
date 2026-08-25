import type { ReplaceConfirmedRentalAssetResponseDto } from "@repo/api-contracts";
import { type MutationOptions, useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
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
			invalidates: rentalKeys.all(),
			...options?.meta,
		},
	});
}
