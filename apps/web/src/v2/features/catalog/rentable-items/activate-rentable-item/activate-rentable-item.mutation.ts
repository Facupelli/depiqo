import type { ActivateRentableItemResponseDto } from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { rentableItemKeys } from "../rentable-items.queries";
import {
	type ActivateRentableItemVariables,
	activateRentableItem,
} from "./activate-rentable-item.api";

type ActivateRentableItemOptions = Omit<
	MutationOptions<
		ActivateRentableItemResponseDto,
		ProblemDetailsError,
		ActivateRentableItemVariables
	>,
	"mutationFn" | "mutationKey"
>;

export function useActivateRentableItem(options?: ActivateRentableItemOptions) {
	return useMutation<
		ActivateRentableItemResponseDto,
		ProblemDetailsError,
		ActivateRentableItemVariables
	>({
		...options,
		mutationFn: activateRentableItem,
		meta: {
			invalidates: rentableItemKeys.all(),
			...options?.meta,
		},
	});
}
