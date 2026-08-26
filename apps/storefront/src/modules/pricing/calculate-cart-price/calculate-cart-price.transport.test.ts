import { describe, expect, it } from "vitest";
import { parseCalculateCartPriceTransportBody } from "./calculate-cart-price.transport";

const cartPriceBody = {
	branchId: "branch-1",
	rentalPeriod: {
		start: "2026-08-10T13:00:00Z",
		end: "2026-08-11T10:00:00-03:00",
	},
	selectedOffers: [{ rentalOfferId: "offer-1", quantity: 1 }],
	insuranceSelected: false,
};

describe("cart-price Storefront transport", () => {
	it("preserves explicit-offset instants through server-function and BFF validation", () => {
		const serverFunctionInput =
			parseCalculateCartPriceTransportBody(cartPriceBody);
		const bffTransportInput =
			parseCalculateCartPriceTransportBody(serverFunctionInput);

		expect(serverFunctionInput).toEqual(cartPriceBody);
		expect(bffTransportInput).toEqual(cartPriceBody);
		expect(typeof bffTransportInput.rentalPeriod.start).toBe("string");
		expect(typeof bffTransportInput.rentalPeriod.end).toBe("string");
	});
});
