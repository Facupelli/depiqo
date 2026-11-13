import { describe, expect, it } from "vitest";
import { countRentalReservationUnits } from "./rental-confirmation-summary";

describe("countRentalReservationUnits", () => {
	it("counts physical units across equipment and kit demand lines", () => {
		expect(
			countRentalReservationUnits([
				{ demandLines: [{ quantity: 2 }] },
				{ demandLines: [{ quantity: 3 }, { quantity: 6 }] },
			]),
		).toBe(11);
	});

	it("does not multiply demand quantities by the product quantity again", () => {
		const selections = [
			{ quantity: 3, demandLines: [{ quantity: 3 }, { quantity: 6 }] },
		];
		expect(countRentalReservationUnits(selections)).toBe(9);
	});

	it("does not include separately assigned accessories", () => {
		const rental = {
			selections: [{ demandLines: [{ quantity: 1 }] }],
			accessories: [{ quantity: 4 }],
		};
		expect(countRentalReservationUnits(rental.selections)).toBe(1);
	});

	it("returns zero when no demand lines exist", () => {
		expect(countRentalReservationUnits([])).toBe(0);
		expect(countRentalReservationUnits([{ demandLines: [] }])).toBe(0);
	});
});
