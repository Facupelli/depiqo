import type {
	CreateEquipmentBodyDto,
	CreateEquipmentResponseDto,
} from "@repo/api-contracts";
import type { MutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { assetKeys } from "@/modules/inventory/assets/assets.queries";
import { productKeys } from "@/modules/products/products.queries";
import { equipmentTypeOptionKeys } from "../equipment-type-options.queries";
import { listEquipmentTypeKeys } from "../list-equipment-types/list-equipment-types.queries";
import { createEquipment } from "./create-equipment.api";

type CreateEquipmentOptions = Omit<
	MutationOptions<CreateEquipmentResponseDto, unknown, CreateEquipmentBodyDto>,
	"mutationFn" | "mutationKey"
>;

export function useCreateEquipment(options?: CreateEquipmentOptions) {
	return useMutation({
		...options,
		mutationFn: createEquipment,
		meta: {
			invalidates: (variables: CreateEquipmentBodyDto) => [
				listEquipmentTypeKeys.all(),
				equipmentTypeOptionKeys.all(),
				assetKeys.all(),
				...(variables.standaloneRental ? [productKeys.all()] : []),
			],
			...options?.meta,
		},
	});
}
