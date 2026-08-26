import { describe, expect, it } from "vitest";
import { ProblemDetailsError } from "@/shared/errors";
import { toAssignRentalAccessoriesUiError } from "./assign-rental-accessories.errors";

describe("toAssignRentalAccessoriesUiError", () => {
	it("maps a deterministic availability conflict to its accessory row", () => {
		const error = new ProblemDetailsError({
			type: "https://api.depiqo.com/problems/rental_commitment/insufficient_asset_availability",
			title: "Insufficient asset availability",
			status: 409,
			detail: "ignored",
			code: "rental_commitment.insufficient_asset_availability",
			availability: {
				sourceRentalDemandLineId: "demand-line-1",
				equipmentTypeId: "equipment-type-1",
				requestedQuantity: 4,
				availableQuantity: 3,
			},
		});

		expect(toAssignRentalAccessoriesUiError(error)).toEqual({
			message:
				"No se pudieron asignar todos los accesorios. Revisá las cantidades marcadas.",
			shouldRefreshAvailability: true,
			affectedEquipmentTypeId: "equipment-type-1",
		});
	});

	it("maps an availability race to sheet-level feedback only", () => {
		const error = new ProblemDetailsError({
			type: "https://api.depiqo.com/problems/rental_commitment/asset_availability_changed",
			title: "Asset availability changed",
			status: 409,
			detail: "ignored",
			code: "rental_commitment.asset_availability_changed",
		});

		expect(toAssignRentalAccessoriesUiError(error)).toEqual({
			message:
				"La disponibilidad cambió mientras asignabas los accesorios. Actualizamos el stock; revisá las cantidades e intentá nuevamente.",
			shouldRefreshAvailability: true,
		});
	});
});
