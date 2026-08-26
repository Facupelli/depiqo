import type { ChangeAssetOwnerResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { equipmentTypeDetailKeys } from "@/modules/inventory/equipment-types/equipment-type-detail/equipment-type-detail.queries";
import { equipmentTypeSummaryKeys } from "@/modules/inventory/equipment-types/list-equipment-types/equipment-type-summaries.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { assetKeys } from "../assets.queries";
import {
	type ChangeAssetOwnerVariables,
	changeAssetOwner,
} from "./change-asset-owner.api";

export type ChangeAssetOwnerMutationVariables = ChangeAssetOwnerVariables & {
	equipmentTypeId: string;
};

type ChangeAssetOwnerOptions = Omit<
	MutationOptions<
		ChangeAssetOwnerResponseDto,
		ProblemDetailsError,
		ChangeAssetOwnerMutationVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useChangeAssetOwner(options?: ChangeAssetOwnerOptions) {
	return useMutation<
		ChangeAssetOwnerResponseDto,
		ProblemDetailsError,
		ChangeAssetOwnerMutationVariables
	>({
		...options,
		mutationFn: ({ assetId, body }) => changeAssetOwner({ assetId, body }),
		meta: {
			invalidates: (variables: ChangeAssetOwnerMutationVariables) => [
				equipmentTypeDetailKeys.detail(variables.equipmentTypeId),
				equipmentTypeSummaryKeys.all(),
				assetKeys.all(),
			],
			...options?.meta,
		},
	});
}
