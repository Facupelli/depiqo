import {
	type GetRentalAccessoryDefaultsResponseDto,
	type GetRentalDetailResponseDto,
	type ReplaceRentalDemandLineAccessoriesBodyDto,
	ReplaceRentalDemandLineAccessoriesBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

const demandLineAccessoryItemSchema = z.object({
	equipmentTypeId: z.string().min(1),
	equipmentTypeName: z.string().min(1),
	quantity: z.number().int().positive("La cantidad debe ser mayor a cero"),
});

export const demandLineAccessoryAssignmentFormSchema = z.object({
	accessories: z.array(demandLineAccessoryItemSchema),
});

export type DemandLineAccessoryAssignmentFormValues = z.infer<
	typeof demandLineAccessoryAssignmentFormSchema
>;

export type DemandLineAccessoryMetadata = {
	recommendedQuantity: number;
	availableCount: number;
};

export function createDemandLineAccessoryAssignmentFormDefaultValues({
	rentalDemandLineId,
	defaults,
	existingAccessories,
}: {
	rentalDemandLineId: string;
	defaults?: GetRentalAccessoryDefaultsResponseDto;
	existingAccessories: GetRentalDetailResponseDto["accessories"];
}): DemandLineAccessoryAssignmentFormValues {
	const persistedAccessories = existingAccessories.filter(
		(accessory) => accessory.sourceRentalDemandLineId === rentalDemandLineId,
	);

	const rows = new Map<
		string,
		DemandLineAccessoryAssignmentFormValues["accessories"][number]
	>();

	if (persistedAccessories.length > 0) {
		for (const accessory of persistedAccessories) {
			rows.set(accessory.equipmentTypeId, {
				equipmentTypeId: accessory.equipmentTypeId,
				equipmentTypeName: accessory.equipmentTypeName,
				quantity: accessory.quantity,
			});
		}
	} else {
		for (const suggestion of defaults?.suggestions ?? []) {
			if (suggestion.sourceRentalDemandLineId !== rentalDemandLineId) continue;
			rows.set(suggestion.accessoryEquipmentTypeId, {
				equipmentTypeId: suggestion.accessoryEquipmentTypeId,
				equipmentTypeName: suggestion.accessoryEquipmentTypeName,
				quantity: suggestion.recommendedQuantity,
			});
		}
	}

	return { accessories: [...rows.values()] };
}

export function createDemandLineAccessoryMetadata(
	rentalDemandLineId: string,
	defaults: GetRentalAccessoryDefaultsResponseDto,
): ReadonlyMap<string, DemandLineAccessoryMetadata> {
	return new Map(
		defaults.suggestions
			.filter(
				(suggestion) =>
					suggestion.sourceRentalDemandLineId === rentalDemandLineId,
			)
			.map((suggestion) => [
				suggestion.accessoryEquipmentTypeId,
				{
					recommendedQuantity: suggestion.recommendedQuantity,
					availableCount: suggestion.availableCount,
				},
			]),
	);
}

export function toReplaceRentalDemandLineAccessoriesDto(
	values: DemandLineAccessoryAssignmentFormValues,
	expectedVersion: number,
): ReplaceRentalDemandLineAccessoriesBodyDto {
	return ReplaceRentalDemandLineAccessoriesBodySchema.parse({
		expectedVersion,
		accessories: values.accessories.map(({ equipmentTypeId, quantity }) => ({
			equipmentTypeId,
			quantity,
		})),
	});
}
