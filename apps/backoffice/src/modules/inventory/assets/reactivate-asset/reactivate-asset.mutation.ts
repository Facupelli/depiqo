import type { ReactivateAssetResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { equipmentTypeSummaryKeys } from "@/modules/inventory/equipment-types/equipment-type-detail/equipment-type-summary.queries";
import { equipmentTypeAssetsKeys } from "@/modules/inventory/equipment-types/equipment-type-detail/units/equipment-type-assets.queries";
import { listEquipmentTypeKeys } from "@/modules/inventory/equipment-types/public";
import type { ProblemDetailsError } from "@/shared/errors";
import { assetKeys } from "../assets.queries";
import {
	type ReactivateAssetVariables,
	reactivateAsset,
} from "./reactivate-asset.api";

type Variables = ReactivateAssetVariables & { equipmentTypeId: string };
type Options = Omit<
	MutationOptions<ReactivateAssetResponseDto, ProblemDetailsError, Variables>,
	"mutationFn" | "mutationKey"
>;

export function useReactivateAsset(options?: Options) {
	return useMutation<
		ReactivateAssetResponseDto,
		ProblemDetailsError,
		Variables
	>({
		...options,
		mutationFn: ({ assetId }) => reactivateAsset({ assetId }),
		meta: {
			invalidates: (variables: Variables) => [
				equipmentTypeAssetsKeys.equipmentType(variables.equipmentTypeId),
				equipmentTypeSummaryKeys.summary(variables.equipmentTypeId),
				listEquipmentTypeKeys.lists(),
				assetKeys.all(),
			],
			...options?.meta,
		},
	});
}
