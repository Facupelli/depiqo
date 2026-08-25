import { describe, expect, it } from "vitest";
import {
	type AddProductOfferOption,
	clampQuantity,
	isOfferSelectable,
	isSelectedOfferSubmittable,
} from "./add-selection.utils";

function createOption(
	overrides: Partial<AddProductOfferOption> = {},
): AddProductOfferOption {
	return {
		offer: {
			id: "offer-1",
			name: "Taladro",
			kind: "SINGLE",
			image: null,
			description: null,
			requirements: [],
		},
		imageUrl: null,
		isAdded: false,
		isSelected: false,
		availability: "available",
		availableCount: 3,
		...overrides,
	};
}

describe("isOfferSelectable", () => {
	it("is selectable only when available and not already added", () => {
		expect(
			isOfferSelectable({ isAdded: false, availability: "available" }),
		).toBe(true);
		expect(
			isOfferSelectable({ isAdded: true, availability: "available" }),
		).toBe(false);
		expect(
			isOfferSelectable({ isAdded: false, availability: "checking" }),
		).toBe(false);
		expect(
			isOfferSelectable({ isAdded: false, availability: "unavailable" }),
		).toBe(false);
		expect(isOfferSelectable({ isAdded: false, availability: "error" })).toBe(
			false,
		);
	});
});

describe("clampQuantity", () => {
	it("keeps a quantity inside the valid range unchanged", () => {
		expect(clampQuantity(2, 3)).toBe(2);
	});

	it("reconciles the quantity down when availability decreases", () => {
		expect(clampQuantity(5, 3)).toBe(3);
	});

	it("never goes below one", () => {
		expect(clampQuantity(0, 3)).toBe(1);
		expect(clampQuantity(-1, null)).toBe(1);
	});

	it("keeps the requested quantity while availability is unknown", () => {
		expect(clampQuantity(4, null)).toBe(4);
	});
});

describe("isSelectedOfferSubmittable", () => {
	it("is submittable for a present, available offer within bounds", () => {
		const option = createOption({ isSelected: true });
		expect(isSelectedOfferSubmittable(option, 2)).toBe(true);
	});

	it("is not submittable without a selected offer in the result set", () => {
		expect(isSelectedOfferSubmittable(null, 1)).toBe(false);
	});

	it("is not submittable when the offer was already added to the rental", () => {
		const option = createOption({ isSelected: true, isAdded: true });
		expect(isSelectedOfferSubmittable(option, 1)).toBe(false);
	});

	it("is not submittable while availability is unknown or failed", () => {
		for (const availability of ["checking", "unavailable", "error"] as const) {
			const option = createOption({
				isSelected: true,
				availability,
				availableCount: null,
			});
			expect(isSelectedOfferSubmittable(option, 1)).toBe(false);
		}
	});

	it("is not submittable with zero availability", () => {
		const option = createOption({ isSelected: true, availableCount: 0 });
		expect(isSelectedOfferSubmittable(option, 1)).toBe(false);
	});

	it("is not submittable when the quantity exceeds availability", () => {
		const option = createOption({ isSelected: true, availableCount: 2 });
		expect(isSelectedOfferSubmittable(option, 3)).toBe(false);
	});

	it("is not submittable with a non-integer quantity", () => {
		const option = createOption({ isSelected: true });
		expect(isSelectedOfferSubmittable(option, 1.5)).toBe(false);
	});
});
