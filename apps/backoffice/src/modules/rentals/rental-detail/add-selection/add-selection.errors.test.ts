import { describe, expect, it } from "vitest";
import { ProblemDetailsError } from "@/shared/errors";
import { toAddSelectionUiError } from "./add-selection.errors";

describe("toAddSelectionUiError", () => {
	it("maps a version conflict to a detail refresh without auto-resubmit", () => {
		const error = new ProblemDetailsError({
			type: "https://api.depiqo.com/problems/rental_commitment/rental_version_conflict",
			title: "Rental version conflict",
			status: 409,
			detail: "ignored",
			code: "rental_commitment.rental_version_conflict",
		});

		expect(toAddSelectionUiError(error)).toEqual({
			message:
				"El pedido cambió mientras agregabas el producto. Actualizamos la información; revisá los datos e intentá nuevamente.",
			shouldRefreshDetail: true,
			shouldRefreshAvailability: true,
		});
	});

	it("maps a duplicate selection to actionable feedback", () => {
		const error = new ProblemDetailsError({
			type: "https://api.depiqo.com/problems/rental_commitment/duplicate_rental_offer_selection",
			title: "Duplicate rental offer selection",
			status: 409,
			detail: "ignored",
			code: "rental_commitment.duplicate_rental_offer_selection",
		});

		const uiError = toAddSelectionUiError(error);

		expect(uiError.message).toContain("ya fue agregado");
		expect(uiError.shouldRefreshDetail).toBe(true);
		expect(uiError.shouldRefreshAvailability).toBe(false);
	});

	it("maps insufficient asset availability to an availability refresh", () => {
		const error = new ProblemDetailsError({
			type: "https://api.depiqo.com/problems/rental_commitment/insufficient_asset_availability",
			title: "Insufficient asset availability",
			status: 409,
			detail: "ignored",
			code: "rental_commitment.insufficient_asset_availability",
		});

		expect(toAddSelectionUiError(error)).toEqual({
			message:
				"No hay suficientes unidades disponibles para el período del pedido. Actualizamos la disponibilidad; ajustá la cantidad e intentá nuevamente.",
			shouldRefreshDetail: false,
			shouldRefreshAvailability: true,
		});
	});

	it("maps an unavailable catalog selection to product-level feedback", () => {
		const error = new ProblemDetailsError({
			type: "https://api.depiqo.com/problems/rental_commitment/catalog_selection_unavailable",
			title: "Catalog selection unavailable",
			status: 409,
			detail: "ignored",
			code: "rental_commitment.catalog_selection_unavailable",
		});

		expect(toAddSelectionUiError(error)).toEqual({
			message:
				"Este producto ya no está disponible para alquilar. Actualizamos la información; elegí otro producto.",
			shouldRefreshDetail: false,
			shouldRefreshAvailability: true,
		});
	});

	it("maps a status that forbids editing to page-refresh guidance", () => {
		const error = new ProblemDetailsError({
			type: "https://api.depiqo.com/problems/rental_commitment/rental_cannot_be_edited_from_status",
			title: "Rental cannot be edited from status",
			status: 409,
			detail: "ignored",
			code: "rental_commitment.rental_cannot_be_edited_from_status",
		});

		expect(toAddSelectionUiError(error)).toEqual({
			message:
				"El estado actual del pedido no permite agregar productos. Actualizá la página e intentá nuevamente.",
			shouldRefreshDetail: true,
			shouldRefreshAvailability: false,
		});
	});

	it("falls back to a generic message for unknown errors", () => {
		expect(toAddSelectionUiError(new Error("boom"))).toEqual({
			message:
				"No pudimos agregar el producto. Revisá tu conexión e intentá nuevamente.",
			shouldRefreshDetail: false,
			shouldRefreshAvailability: false,
		});
	});
});
