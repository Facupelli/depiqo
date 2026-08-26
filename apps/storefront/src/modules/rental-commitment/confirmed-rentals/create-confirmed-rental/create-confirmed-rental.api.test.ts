import { describe, expect, it, vi } from "vitest";
import { createConfirmedRental } from "./create-confirmed-rental.api";

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/modules/tenant-management/auth/csrf-token", () => ({
	getCustomerCsrfToken: vi.fn(async () => "csrf-token"),
}));

vi.mock("@/modules/tenant-management/auth/session-browser-api", () => ({
	sessionBrowserApiFetch: (...args: unknown[]) => fetchMock(...args),
}));

describe("createConfirmedRental", () => {
	it("sends the idempotency key as a request header", async () => {
		fetchMock.mockResolvedValue({ rentalNumber: 42 });

		await createConfirmedRental({
			body: {
				branchId: "branch-1",
				period: { start: "2026-08-10T10:00:00Z", end: "2026-08-10T12:00:00Z" },
				selectedOffers: [{ rentalOfferId: "offer-1", quantity: 1 }],
				fulfillmentMethod: "PICKUP",
			},
			idempotencyKey: "0d7f5698-1b1e-4a5c-9f3e-2b6c8d90e1a2",
		});

		expect(fetchMock).toHaveBeenCalledWith(
			"/rental-commitments/confirmed-rentals",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					"idempotency-key": "0d7f5698-1b1e-4a5c-9f3e-2b6c8d90e1a2",
				}),
			}),
		);
	});
});
