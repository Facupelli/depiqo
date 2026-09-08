import type { UpdateAssetResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { equipmentTypeAssetsKeys } from "@/modules/inventory/equipment-types/equipment-type-detail/units/equipment-type-assets.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { assetKeys } from "../assets.queries";
import { type UpdateAssetVariables, updateAsset } from "./edit-asset.api";

type UpdateAssetMutationVariables = UpdateAssetVariables & {
	equipmentTypeId: string;
};

type UpdateAssetOptions = Omit<
	MutationOptions<
		UpdateAssetResponseDto,
		ProblemDetailsError,
		UpdateAssetMutationVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useUpdateAsset(options?: UpdateAssetOptions) {
	return useMutation<
		UpdateAssetResponseDto,
		ProblemDetailsError,
		UpdateAssetMutationVariables
	>({
		...options,
		mutationFn: ({ assetId, body }) => updateAsset({ assetId, body }),
		meta: {
			invalidates: (variables: UpdateAssetMutationVariables) => [
				equipmentTypeAssetsKeys.equipmentType(variables.equipmentTypeId),
				assetKeys.all(),
			],
			...options?.meta,
		},
	});
}
