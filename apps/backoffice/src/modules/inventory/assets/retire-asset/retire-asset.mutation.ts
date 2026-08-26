import type { RetireAssetResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { equipmentTypeDetailKeys } from "@/modules/inventory/equipment-types/equipment-type-detail/equipment-type-detail.queries";
import { equipmentTypeSummaryKeys } from "@/modules/inventory/equipment-types/list-equipment-types/equipment-type-summaries.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { assetKeys } from "../assets.queries";
import { type RetireAssetVariables, retireAsset } from "./retire-asset.api";

type RetireAssetMutationVariables = RetireAssetVariables & {
	equipmentTypeId: string;
};

type RetireAssetOptions = Omit<
	MutationOptions<
		RetireAssetResponseDto,
		ProblemDetailsError,
		RetireAssetMutationVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useRetireAsset(options?: RetireAssetOptions) {
	return useMutation<
		RetireAssetResponseDto,
		ProblemDetailsError,
		RetireAssetMutationVariables
	>({
		...options,
		mutationFn: ({ assetId }) => retireAsset({ assetId }),
		meta: {
			invalidates: (variables: RetireAssetMutationVariables) => [
				equipmentTypeDetailKeys.detail(variables.equipmentTypeId),
				equipmentTypeSummaryKeys.all(),
				assetKeys.all(),
			],
			...options?.meta,
		},
	});
}
