import type { GetRentalAccessoryDefaultsResponseDto } from "@repo/api-contracts";
import type { RentalAccessoryAssignmentFormValues } from "./rental-accessory-assignment.schema";

export function createRentalAccessoryAssignmentKey({
	sourceRentalDemandLineId,
	equipmentTypeId,
}: {
	sourceRentalDemandLineId: string | null | undefined;
	equipmentTypeId: string;
}): string {
	return `${sourceRentalDemandLineId ?? ""}:${equipmentTypeId}`;
}

export function createSharedAccessoryCapacityByEquipmentType(
	defaults: GetRentalAccessoryDefaultsResponseDto,
): ReadonlyMap<string, number> {
	const capacities = new Map<string, number>();

	for (const suggestion of defaults.suggestions) {
		const existingCapacity = capacities.get(
			suggestion.accessoryEquipmentTypeId,
		);

		if (
			existingCapacity !== undefined &&
			existingCapacity !== suggestion.availableCount
		) {
			throw new Error(
				`Accessory equipment type "${suggestion.accessoryEquipmentTypeId}" returned inconsistent shared availability.`,
			);
		}

		capacities.set(
			suggestion.accessoryEquipmentTypeId,
			suggestion.availableCount,
		);
	}

	return capacities;
}

export type SharedAccessoryPoolState = {
	equipmentTypeId: string;
	capacity: number;
	selectedQuantity: number;
	isOverCapacity: boolean;
	rowMaximumByKey: ReadonlyMap<string, number>;
	otherSelectedGroupsByRowKey: ReadonlyMap<string, string[]>;
};

export function createSharedAccessoryPoolStates(
	values: RentalAccessoryAssignmentFormValues,
	capacities: ReadonlyMap<string, number>,
): ReadonlyMap<string, SharedAccessoryPoolState> {
	const rowsByEquipmentType = new Map<
		string,
		Array<{
			key: string;
			sourceEquipmentTypeName: string;
			quantity: number;
		}>
	>();

	for (const group of values.groups) {
		for (const accessory of group.accessories) {
			const rows = rowsByEquipmentType.get(accessory.equipmentTypeId) ?? [];
			rows.push({
				key: createRentalAccessoryAssignmentKey({
					sourceRentalDemandLineId: group.sourceRentalDemandLineId,
					equipmentTypeId: accessory.equipmentTypeId,
				}),
				sourceEquipmentTypeName: group.sourceEquipmentTypeName,
				quantity: accessory.quantity,
			});
			rowsByEquipmentType.set(accessory.equipmentTypeId, rows);
		}
	}

	const states = new Map<string, SharedAccessoryPoolState>();
	for (const [equipmentTypeId, rows] of rowsByEquipmentType) {
		const capacity = capacities.get(equipmentTypeId) ?? 0;
		const selectedQuantity = rows.reduce(
			(total, row) => total + row.quantity,
			0,
		);
		const rowMaximumByKey = new Map<string, number>();
		const otherSelectedGroupsByRowKey = new Map<string, string[]>();

		for (const row of rows) {
			const otherRows = rows.filter((candidate) => candidate.key !== row.key);
			const selectedByOthers = otherRows.reduce(
				(total, candidate) => total + candidate.quantity,
				0,
			);
			rowMaximumByKey.set(
				row.key,
				Math.max(row.quantity, capacity - selectedByOthers),
			);
			otherSelectedGroupsByRowKey.set(
				row.key,
				otherRows
					.filter((candidate) => candidate.quantity > 0)
					.map((candidate) => candidate.sourceEquipmentTypeName),
			);
		}

		states.set(equipmentTypeId, {
			equipmentTypeId,
			capacity,
			selectedQuantity,
			isOverCapacity: selectedQuantity > capacity,
			rowMaximumByKey,
			otherSelectedGroupsByRowKey,
		});
	}

	return states;
}
