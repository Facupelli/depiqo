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
	recommendedQuantity: z.number().int().nonnegative().nullable(),
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
	demandLines = [],
	existingAccessories,
}: {
	defaults: GetRentalAccessoryDefaultsResponseDto;
	demandLines?: GetRentalDetailResponseDto["selections"][number]["demandLines"];
	existingAccessories: GetRentalDetailResponseDto["accessories"];
}): RentalAccessoryAssignmentFormValues {
	const persistedAccessories = existingAccessories.filter(
		(accessory) => accessory.sourceRentalDemandLineId !== null,
	);
	const existingQuantityBySourceAndEquipment = new Map(
		persistedAccessories.map((accessory) => [
			createRentalAccessoryAssignmentKey({
				sourceRentalDemandLineId: accessory.sourceRentalDemandLineId,
				equipmentTypeId: accessory.equipmentTypeId,
			}),
			accessory.quantity,
		]),
	);

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

	for (const accessory of persistedAccessories) {
		const remainingCapacity = remainingCapacityByEquipmentType.get(
			accessory.equipmentTypeId,
		);
		if (remainingCapacity !== undefined) {
			remainingCapacityByEquipmentType.set(
				accessory.equipmentTypeId,
				remainingCapacity - accessory.quantity,
			);
		}
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
		}

		groupsByDemandLine.set(suggestion.sourceRentalDemandLineId, group);
	}

	for (const row of rowsWithoutExistingQuantity) {
		const remainingCapacity = Math.max(
			0,
			remainingCapacityByEquipmentType.get(row.equipmentTypeId) ?? 0,
		);
		const quantity = Math.min(
			row.accessory.recommendedQuantity ?? 0,
			remainingCapacity,
		);
		row.accessory.quantity = quantity;
		remainingCapacityByEquipmentType.set(
			row.equipmentTypeId,
			remainingCapacity - quantity,
		);
	}

	const demandLineById = new Map(demandLines.map((line) => [line.id, line]));
	for (const persistedAccessory of persistedAccessories) {
		const sourceRentalDemandLineId =
			persistedAccessory.sourceRentalDemandLineId;
		if (sourceRentalDemandLineId === null) continue;
		const key = createRentalAccessoryAssignmentKey({
			sourceRentalDemandLineId,
			equipmentTypeId: persistedAccessory.equipmentTypeId,
		});
		const group = groupsByDemandLine.get(sourceRentalDemandLineId);
		if (
			group?.accessories.some(
				(row) =>
					createRentalAccessoryAssignmentKey({
						sourceRentalDemandLineId,
						equipmentTypeId: row.equipmentTypeId,
					}) === key,
			)
		) {
			continue;
		}

		const demandLine = demandLineById.get(sourceRentalDemandLineId);
		if (!demandLine) {
			throw new Error(
				`Persisted accessory references unknown rental demand line "${sourceRentalDemandLineId}".`,
			);
		}

		const targetGroup: RentalAccessoryAssignmentGroupFormValues = group ?? {
			sourceRentalDemandLineId,
			sourceEquipmentTypeId: demandLine.equipmentTypeId,
			sourceEquipmentTypeName: demandLine.equipmentTypeName,
			sourceQuantity: demandLine.quantity,
			accessories: [],
		};
		targetGroup.accessories.push({
			equipmentTypeId: persistedAccessory.equipmentTypeId,
			equipmentTypeName: persistedAccessory.equipmentTypeName,
			recommendedQuantity: null,
			quantity: persistedAccessory.quantity,
		});
		groupsByDemandLine.set(sourceRentalDemandLineId, targetGroup);
	}

	return { groups: Array.from(groupsByDemandLine.values()) };
}

export function toAssignRentalAccessoriesDto(
	values: RentalAccessoryAssignmentFormValues,
	generalAccessories: GetRentalDetailResponseDto["accessories"] = [],
): AssignRentalAccessoriesBodyDto {
	const dto = {
		accessories: [
			...values.groups.flatMap((group) =>
				group.accessories
					.filter((accessory) => accessory.quantity > 0)
					.map((accessory) => ({
						sourceRentalDemandLineId: group.sourceRentalDemandLineId,
						equipmentTypeId: accessory.equipmentTypeId,
						quantity: accessory.quantity,
					})),
			),
			...generalAccessories
				.filter((accessory) => accessory.sourceRentalDemandLineId === null)
				.map((accessory) => ({
					equipmentTypeId: accessory.equipmentTypeId,
					quantity: accessory.quantity,
				})),
		],
	};

	return AssignRentalAccessoriesBodySchema.parse(dto);
}
