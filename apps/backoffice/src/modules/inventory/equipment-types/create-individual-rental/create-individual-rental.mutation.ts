import type {
	CreateIndividualRentalBodyDto,
	CreateIndividualRentalResponseDto,
} from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { productKeys } from "@/modules/products/products.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { equipmentTypeRentalUsageKeys } from "../equipment-type-rental-usage.keys";
import { listEquipmentTypeKeys } from "../list-equipment-types/list-equipment-types.queries";
import { createIndividualRental } from "./create-individual-rental.api";

type CreateIndividualRentalOptions = Omit<
	MutationOptions<
		CreateIndividualRentalResponseDto,
		ProblemDetailsError,
		CreateIndividualRentalBodyDto
	>,
	"mutationFn" | "mutationKey"
>;

export function useCreateIndividualRental(
	options?: CreateIndividualRentalOptions,
) {
	return useMutation({
		...options,
		mutationFn: createIndividualRental,
		meta: {
			invalidates: (variables: CreateIndividualRentalBodyDto) => [
				equipmentTypeRentalUsageKeys.detail(variables.equipmentTypeId),
				listEquipmentTypeKeys.lists(),
				productKeys.lists(),
			],
			...options?.meta,
		},
	});
}
