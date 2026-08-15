import { describe, expect, it } from "vitest";
import dayjs from "@/lib/dates/dayjs";
import {
	getOrdersCalendarEventGeometry,
	type OrdersCalendarEventGeometryInput,
} from "./orders-calendar.utils";

const timezone = "Europe/Madrid";

function createOrder(
	pickupAt: string,
	returnAt: string,
	pickupDate: string,
	returnDate: string,
): OrdersCalendarEventGeometryInput {
	return {
		pickupAt: dayjs.utc(pickupAt),
		returnAt: dayjs.utc(returnAt),
		pickupDate: dayjs.utc(pickupDate),
		returnDate: dayjs.utc(returnDate),
	};
}

describe("getOrdersCalendarEventGeometry", () => {
	it("uses pickup and return clock times for a same-day rental", () => {
		const geometry = getOrdersCalendarEventGeometry(
			createOrder(
				"2026-08-13T08:00:00.000Z",
				"2026-08-13T14:00:00.000Z",
				"2026-08-13",
				"2026-08-13",
			),
			timezone,
		);

		expect(geometry).toEqual({
			startDate: "2026-08-13",
			exclusiveEndDate: "2026-08-14",
			startFraction: 10 / 24,
			finalOccupiedDate: "2026-08-13",
			finalFraction: 16 / 24,
		});
	});

	it("includes a non-midnight return date in the all-day span", () => {
		const geometry = getOrdersCalendarEventGeometry(
			createOrder(
				"2026-08-13T20:00:00.000Z",
				"2026-08-14T20:00:00.000Z",
				"2026-08-13",
				"2026-08-14",
			),
			timezone,
		);

		expect(geometry).toMatchObject({
			exclusiveEndDate: "2026-08-15",
			startFraction: 22 / 24,
			finalOccupiedDate: "2026-08-14",
			finalFraction: 22 / 24,
		});
	});

	it("uses the preceding day as the final occupied day for a midnight return", () => {
		const geometry = getOrdersCalendarEventGeometry(
			createOrder(
				"2026-08-13T20:00:00.000Z",
				"2026-08-13T22:00:00.000Z",
				"2026-08-13",
				"2026-08-14",
			),
			timezone,
		);

		expect(geometry).toMatchObject({
			exclusiveEndDate: "2026-08-14",
			startFraction: 22 / 24,
			finalOccupiedDate: "2026-08-13",
			finalFraction: 1,
		});
	});

	it("keeps a full local day bounded by the following midnight", () => {
		const geometry = getOrdersCalendarEventGeometry(
			createOrder(
				"2026-08-12T22:00:00.000Z",
				"2026-08-13T22:00:00.000Z",
				"2026-08-13",
				"2026-08-14",
			),
			timezone,
		);

		expect(geometry).toMatchObject({
			exclusiveEndDate: "2026-08-14",
			startFraction: 0,
			finalOccupiedDate: "2026-08-13",
			finalFraction: 1,
		});
	});
});
