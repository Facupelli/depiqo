import {
	type AssignRentalAccessoriesBodyDto,
	AssignRentalAccessoriesBodySchema,
	type GetRentalAccessoryDefaultsResponseDto,
	type GetRentalDetailResponseDto,
} from "@repo/api-contracts";
import { z } from "zod";
import { createRentalAccessoryAssignmentKey } from "./rental-accessory-assignment.utils";

const accessoryAssignmentItemSchema = z.object({
	equipmentTypeId: z.string().min(1),
	equipmentTypeName: z.string().min(1),
	recommendedQuantity: z.number().int().nonnegative(),
	quantity: z.number().int().nonnegative(),
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
			createRentalAccessoryAssignmentKey({
				sourceRentalDemandLineId: accessory.sourceRentalDemandLineId,
				equipmentTypeId: accessory.equipmentTypeId,
			}),
			accessory.quantity,
		);
	}

	const groupsByDemandLine = new Map<
		string,
		RentalAccessoryAssignmentGroupFormValues
	>();
	const rowsWithoutExistingQuantity: Array<{
		accessory: RentalAccessoryAssignmentGroupFormValues["accessories"][number];
		equipmentTypeId: string;
	}> = [];
	const remainingCapacityByEquipmentType = new Map<string, number>();

	for (const suggestion of defaults.suggestions) {
		const currentCapacity = remainingCapacityByEquipmentType.get(
			suggestion.accessoryEquipmentTypeId,
		);
		if (
			currentCapacity !== undefined &&
			currentCapacity !== suggestion.availableCount
		) {
			throw new Error(
				`Accessory equipment type "${suggestion.accessoryEquipmentTypeId}" returned inconsistent shared availability.`,
			);
		}
		remainingCapacityByEquipmentType.set(
			suggestion.accessoryEquipmentTypeId,
			suggestion.availableCount,
		);
	}

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
			createRentalAccessoryAssignmentKey({
				sourceRentalDemandLineId: suggestion.sourceRentalDemandLineId,
				equipmentTypeId: suggestion.accessoryEquipmentTypeId,
			}),
		);

		const accessory = {
			equipmentTypeId: suggestion.accessoryEquipmentTypeId,
			equipmentTypeName: suggestion.accessoryEquipmentTypeName,
			recommendedQuantity: suggestion.recommendedQuantity,
			quantity: existingQuantity ?? 0,
		};
		group.accessories.push(accessory);

		if (existingQuantity === undefined) {
			rowsWithoutExistingQuantity.push({
				accessory,
				equipmentTypeId: suggestion.accessoryEquipmentTypeId,
			});
		} else {
			remainingCapacityByEquipmentType.set(
				suggestion.accessoryEquipmentTypeId,
				(remainingCapacityByEquipmentType.get(
					suggestion.accessoryEquipmentTypeId,
				) ?? 0) - existingQuantity,
			);
		}

		groupsByDemandLine.set(suggestion.sourceRentalDemandLineId, group);
	}

	for (const row of rowsWithoutExistingQuantity) {
		const remainingCapacity = Math.max(
			0,
			remainingCapacityByEquipmentType.get(row.equipmentTypeId) ?? 0,
		);
		const quantity = Math.min(
			row.accessory.recommendedQuantity,
			remainingCapacity,
		);
		row.accessory.quantity = quantity;
		remainingCapacityByEquipmentType.set(
			row.equipmentTypeId,
			remainingCapacity - quantity,
		);
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
