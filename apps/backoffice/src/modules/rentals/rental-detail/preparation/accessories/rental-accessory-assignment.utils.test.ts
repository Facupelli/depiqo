import { describe, expect, it } from "vitest";
import type { RentalAccessoryAssignmentFormValues } from "./rental-accessory-assignment.schema";
import { createSharedAccessoryPoolStates } from "./rental-accessory-assignment.utils";

function values(quantities: {
	a: number;
	b: number;
	independent?: number;
}): RentalAccessoryAssignmentFormValues {
	return {
		groups: [
			{
				sourceRentalDemandLineId: "line-a",
				sourceEquipmentTypeId: "source-a",
				sourceEquipmentTypeName: "Amaran T2c RGBWW",
				sourceQuantity: 1,
				accessories: [
					{
						equipmentTypeId: "bag-type",
						equipmentTypeName: "Bolso",
						recommendedQuantity: 1,
						quantity: quantities.a,
					},
				],
			},
			{
				sourceRentalDemandLineId: "line-b",
				sourceEquipmentTypeId: "source-b",
				sourceEquipmentTypeName: "Kit Nanlite",
				sourceQuantity: 1,
				accessories: [
					{
						equipmentTypeId: "bag-type",
						equipmentTypeName: "Bolso",
						recommendedQuantity: 1,
						quantity: quantities.b,
					},
					...(quantities.independent === undefined
						? []
						: [
								{
									equipmentTypeId: "battery-type",
									equipmentTypeName: "Batería",
									recommendedQuantity: 1,
									quantity: quantities.independent,
								},
							]),
				],
			},
		],
	};
}

describe("createSharedAccessoryPoolStates", () => {
	it("allows redistribution immediately after another row decreases", () => {
		const before = createSharedAccessoryPoolStates(
			values({ a: 1, b: 0 }),
			new Map([["bag-type", 1]]),
		).get("bag-type");
		const after = createSharedAccessoryPoolStates(
			values({ a: 0, b: 0 }),
			new Map([["bag-type", 1]]),
		).get("bag-type");

		expect(before?.rowMaximumByKey.get("line-b:bag-type")).toBe(0);
		expect(after?.rowMaximumByKey.get("line-b:bag-type")).toBe(1);
	});

	it("prevents a second row from exceeding shared capacity and identifies the consuming source", () => {
		const pool = createSharedAccessoryPoolStates(
			values({ a: 1, b: 0 }),
			new Map([["bag-type", 1]]),
		).get("bag-type");

		expect(pool?.rowMaximumByKey.get("line-b:bag-type")).toBe(0);
		expect(pool?.otherSelectedGroupsByRowKey.get("line-b:bag-type")).toEqual([
			"Amaran T2c RGBWW",
		]);
		expect(pool?.otherSelectedGroupsByRowKey.get("line-a:bag-type")).toEqual(
			[],
		);
	});

	it("caps every row when multiple rows consume all shared capacity", () => {
		const pool = createSharedAccessoryPoolStates(
			values({ a: 2, b: 1 }),
			new Map([["bag-type", 3]]),
		).get("bag-type");

		expect(pool?.selectedQuantity).toBe(3);
		expect(pool?.rowMaximumByKey.get("line-a:bag-type")).toBe(2);
		expect(pool?.rowMaximumByKey.get("line-b:bag-type")).toBe(1);
	});

	it("keeps equipment-type pools independent", () => {
		const pools = createSharedAccessoryPoolStates(
			values({ a: 1, b: 0, independent: 1 }),
			new Map([
				["bag-type", 1],
				["battery-type", 2],
			]),
		);

		expect(pools.get("bag-type")?.rowMaximumByKey.get("line-b:bag-type")).toBe(
			0,
		);
		expect(
			pools.get("battery-type")?.rowMaximumByKey.get("line-b:battery-type"),
		).toBe(2);
	});

	it("retains impossible quantities and marks the group as over capacity", () => {
		const pool = createSharedAccessoryPoolStates(
			values({ a: 1, b: 1 }),
			new Map([["bag-type", 1]]),
		).get("bag-type");

		expect(pool?.selectedQuantity).toBe(2);
		expect(pool?.isOverCapacity).toBe(true);
		expect(pool?.rowMaximumByKey.get("line-a:bag-type")).toBe(1);
		expect(pool?.rowMaximumByKey.get("line-b:bag-type")).toBe(1);
	});
});
