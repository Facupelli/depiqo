import { describe, expect, it } from "vitest";
import { buildConfirmedRentalRequest } from "./confirmed-rental-request";

describe("buildConfirmedRentalRequest", () => {
	it("keeps schedule-slot instants as wire strings through contract validation and JSON serialization", () => {
		const result = buildConfirmedRentalRequest({
			branchId: "branch-1",
			items: [{ rentalOfferId: "offer-1", quantity: 1 }],
			pickupSlot: {
				minuteOfDay: 600,
				instant: "2026-08-10T10:00:00Z",
			},
			returnSlot: {
				minuteOfDay: 780,
				instant: "2026-08-10T10:00:00-03:00",
			},
			fulfillmentMethod: "PICKUP",
			deliveryDetails: null,
			insuranceSelected: false,
		});

		expect(result).toEqual({
			ok: true,
			body: expect.objectContaining({
				period: {
					start: "2026-08-10T10:00:00Z",
					end: "2026-08-10T10:00:00-03:00",
				},
			}),
		});
		if (!result.ok)
			throw new Error("Expected a valid confirmed-rental request.");

		expect(typeof result.body.period.start).toBe("string");
		expect(JSON.parse(JSON.stringify(result.body)).period).toEqual(
			result.body.period,
		);
	});
});
