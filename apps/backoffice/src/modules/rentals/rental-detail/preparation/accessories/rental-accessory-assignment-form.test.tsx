// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RentalAccessoryAssignmentFormValues } from "./rental-accessory-assignment.schema";
import { RentalAccessoryAssignmentForm } from "./rental-accessory-assignment-form";

const defaultValues: RentalAccessoryAssignmentFormValues = {
	groups: [
		{
			sourceRentalDemandLineId: "line-a",
			sourceEquipmentTypeId: "source-a",
			sourceEquipmentTypeName: "Amaran T2c RGBWW",
			sourceQuantity: 1,
			accessories: [
				{
					equipmentTypeId: "bag-type",
					equipmentTypeName: "Bolso de transporte Nanlite",
					recommendedQuantity: 1,
					quantity: 1,
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
					equipmentTypeName: "Bolso de transporte Nanlite",
					recommendedQuantity: 1,
					quantity: 1,
				},
			],
		},
	],
};

describe("RentalAccessoryAssignmentForm", () => {
	it("keeps an over-capacity group visible and prevents submission until it is resolved", async () => {
		const onSubmit = vi.fn();
		render(
			<RentalAccessoryAssignmentForm
				defaultValues={defaultValues}
				sharedCapacityByEquipmentType={new Map([["bag-type", 1]])}
				isPending={false}
				onSubmit={onSubmit}
				onCancel={vi.fn()}
				onAccessoryQuantityChange={vi.fn()}
			/>,
		);

		expect(
			screen.getAllByText(
				"La disponibilidad de este accesorio cambió. Hay 1 unidad para repartir entre los equipos de este alquiler. Ajustá las cantidades marcadas e intentá nuevamente.",
			),
		).toHaveLength(2);
		expect(
			(
				screen.getByRole("button", {
					name: "Guardar accesorios",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Restar Bolso de transporte Nanlite para Amaran T2c RGBWW",
			}),
		);

		await waitFor(() => {
			expect(
				screen.queryByText(/La disponibilidad de este accesorio cambió/),
			).toBeNull();
			expect(
				(
					screen.getByRole("button", {
						name: "Guardar accesorios",
					}) as HTMLButtonElement
				).disabled,
			).toBe(false);
		});
	});
});
