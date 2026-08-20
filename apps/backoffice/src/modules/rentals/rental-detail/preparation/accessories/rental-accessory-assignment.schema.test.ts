import type {
	GetRentalAccessoryDefaultsResponseDto,
	GetRentalDetailResponseDto,
} from "@repo/api-contracts";
import { describe, expect, it } from "vitest";
import { createRentalAccessoryAssignmentFormDefaultValues } from "./rental-accessory-assignment.schema";

function defaults(
	suggestions: GetRentalAccessoryDefaultsResponseDto["suggestions"],
): GetRentalAccessoryDefaultsResponseDto {
	return { rentalOrderId: "rental-1", suggestions };
}

function suggestion({
	sourceRentalDemandLineId,
	sourceEquipmentTypeName,
	recommendedQuantity = 1,
	availableCount = 1,
}: {
	sourceRentalDemandLineId: string;
	sourceEquipmentTypeName: string;
	recommendedQuantity?: number;
	availableCount?: number;
}): GetRentalAccessoryDefaultsResponseDto["suggestions"][number] {
	return {
		sourceRentalDemandLineId,
		sourceEquipmentTypeId: `source-type-${sourceRentalDemandLineId}`,
		sourceEquipmentTypeName,
		accessoryEquipmentTypeId: "bag-type",
		accessoryEquipmentTypeName: "Bolso de transporte Nanlite",
		quantityPerUnit: 1,
		sourceQuantity: 1,
		recommendedQuantity,
		availableCount,
	};
}

function existingAccessories(
	accessories: GetRentalDetailResponseDto["accessories"],
): GetRentalDetailResponseDto["accessories"] {
	return accessories;
}

describe("createRentalAccessoryAssignmentFormDefaultValues", () => {
	it("distributes suggestions in stable order without exceeding a shared capacity", () => {
		const values = createRentalAccessoryAssignmentFormDefaultValues({
			defaults: defaults([
				suggestion({
					sourceRentalDemandLineId: "line-a",
					sourceEquipmentTypeName: "Amaran",
				}),
				suggestion({
					sourceRentalDemandLineId: "line-b",
					sourceEquipmentTypeName: "Nanlite",
				}),
			]),
			existingAccessories: [],
		});

		expect(
			values.groups.map((group) => group.accessories[0]?.quantity),
		).toEqual([1, 0]);
	});

	it("reserves persisted quantities before allocating new suggestions", () => {
		const values = createRentalAccessoryAssignmentFormDefaultValues({
			defaults: defaults([
				suggestion({
					sourceRentalDemandLineId: "line-a",
					sourceEquipmentTypeName: "Amaran",
					availableCount: 2,
				}),
				suggestion({
					sourceRentalDemandLineId: "line-b",
					sourceEquipmentTypeName: "Nanlite",
					availableCount: 2,
				}),
			]),
			existingAccessories: existingAccessories([
				{
					id: "accessory-a",
					sourceRentalDemandLineId: "line-a",
					equipmentTypeId: "bag-type",
					equipmentTypeName: "Bolso de transporte Nanlite",
					quantity: 2,
					assignedAssets: [],
				},
			]),
		});

		expect(
			values.groups.map((group) => group.accessories[0]?.quantity),
		).toEqual([2, 0]);
	});

	it("keeps persisted quantities visible when they exceed refreshed capacity", () => {
		const values = createRentalAccessoryAssignmentFormDefaultValues({
			defaults: defaults([
				suggestion({
					sourceRentalDemandLineId: "line-a",
					sourceEquipmentTypeName: "Amaran",
					availableCount: 1,
				}),
			]),
			existingAccessories: existingAccessories([
				{
					id: "accessory-a",
					sourceRentalDemandLineId: "line-a",
					equipmentTypeId: "bag-type",
					equipmentTypeName: "Bolso de transporte Nanlite",
					quantity: 2,
					assignedAssets: [],
				},
			]),
		});

		expect(values.groups[0]?.accessories[0]?.quantity).toBe(2);
	});
});
