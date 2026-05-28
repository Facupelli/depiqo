import type {
	CreateRentableEquipmentBodyDto,
	CreateRentableEquipmentResponseDto,
} from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { rentableItemKeys } from "@/v2/features/catalog/rentable-items/rentable-items.queries";
import { createRentableEquipment } from "./create-rentable-equipment.api";

type CreateRentableEquipmentOptions = Omit<
	MutationOptions<
		CreateRentableEquipmentResponseDto,
		ProblemDetailsError,
		CreateRentableEquipmentBodyDto
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreateRentableEquipment(
	options?: CreateRentableEquipmentOptions,
) {
	return useMutation<
		CreateRentableEquipmentResponseDto,
		ProblemDetailsError,
		CreateRentableEquipmentBodyDto
	>({
		...options,
		mutationFn: createRentableEquipment,
		meta: {
			invalidates: rentableItemKeys.all(),
			...options?.meta,
		},
	});
}
