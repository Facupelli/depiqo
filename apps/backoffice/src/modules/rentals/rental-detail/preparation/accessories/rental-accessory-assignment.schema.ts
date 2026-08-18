import {
	type AssignRentalAccessoriesBodyDto,
	AssignRentalAccessoriesBodySchema,
	type GetRentalAccessoryDefaultsResponseDto,
	type GetRentalDetailResponseDto,
} from "@repo/api-contracts";
import { z } from "zod";

const accessoryAssignmentItemSchema = z
	.object({
		equipmentTypeId: z.string().min(1),
		equipmentTypeName: z.string().min(1),
		recommendedQuantity: z.number().int().nonnegative(),
		availableCount: z.number().int().nonnegative(),
		quantity: z.number().int().nonnegative(),
	})
	.refine((value) => value.quantity <= value.availableCount, {
		message: "La cantidad no puede superar el stock disponible",
		path: ["quantity"],
	});

const accessoryAssignmentGroupSchema = z.object({
	sourceRentalDemandLineId: z.string().min(1),
	sourceEquipmentTypeId: z.string().min(1),
	sourceEquipmentTypeName: z.string().min(1),
	sourceQuantity: z.number().int().positive(),
	accessories: z.array(accessoryAssignmentItemSchema),
});

export const rentalAccessoryAssignmentFormSchema = z.object({
	groups: z.array(accessoryAssignmentGroupSchema),
});

export type RentalAccessoryAssignmentItemFormValues = z.infer<
	typeof accessoryAssignmentItemSchema
>;
export type RentalAccessoryAssignmentGroupFormValues = z.infer<
	typeof accessoryAssignmentGroupSchema
>;
export type RentalAccessoryAssignmentFormValues = z.infer<
	typeof rentalAccessoryAssignmentFormSchema
>;

export function createRentalAccessoryAssignmentFormDefaultValues({
	defaults,
	existingAccessories,
}: {
	defaults: GetRentalAccessoryDefaultsResponseDto;
	existingAccessories: GetRentalDetailResponseDto["accessories"];
}): RentalAccessoryAssignmentFormValues {
	const existingQuantityBySourceAndEquipment = new Map<string, number>();

	for (const accessory of existingAccessories) {
		if (!accessory.sourceRentalDemandLineId) {
			continue;
		}

		existingQuantityBySourceAndEquipment.set(
			createAssignmentKey(
				accessory.sourceRentalDemandLineId,
				accessory.equipmentTypeId,
			),
			accessory.quantity,
		);
	}

	const groupsByDemandLine = new Map<
		string,
		RentalAccessoryAssignmentGroupFormValues
	>();

	for (const suggestion of defaults.suggestions) {
		const group = groupsByDemandLine.get(
			suggestion.sourceRentalDemandLineId,
		) ?? {
			sourceRentalDemandLineId: suggestion.sourceRentalDemandLineId,
			sourceEquipmentTypeId: suggestion.sourceEquipmentTypeId,
			sourceEquipmentTypeName: suggestion.sourceEquipmentTypeName,
			sourceQuantity: suggestion.sourceQuantity,
			accessories: [],
		};

		const existingQuantity = existingQuantityBySourceAndEquipment.get(
			createAssignmentKey(
				suggestion.sourceRentalDemandLineId,
				suggestion.accessoryEquipmentTypeId,
			),
		);

		group.accessories.push({
			equipmentTypeId: suggestion.accessoryEquipmentTypeId,
			equipmentTypeName: suggestion.accessoryEquipmentTypeName,
			recommendedQuantity: suggestion.recommendedQuantity,
			availableCount: suggestion.availableCount,
			quantity:
				existingQuantity ??
				Math.min(suggestion.recommendedQuantity, suggestion.availableCount),
		});

		groupsByDemandLine.set(suggestion.sourceRentalDemandLineId, group);
	}

	return { groups: Array.from(groupsByDemandLine.values()) };
}

export function toAssignRentalAccessoriesDto(
	values: RentalAccessoryAssignmentFormValues,
): AssignRentalAccessoriesBodyDto {
	const dto = {
		accessories: values.groups.flatMap((group) =>
			group.accessories
				.filter((accessory) => accessory.quantity > 0)
				.map((accessory) => ({
					sourceRentalDemandLineId: group.sourceRentalDemandLineId,
					equipmentTypeId: accessory.equipmentTypeId,
					quantity: accessory.quantity,
				})),
		),
	};

	return AssignRentalAccessoriesBodySchema.parse(dto);
}

function createAssignmentKey(
	sourceRentalDemandLineId: string,
	equipmentTypeId: string,
) {
	return `${sourceRentalDemandLineId}:${equipmentTypeId}`;
}
