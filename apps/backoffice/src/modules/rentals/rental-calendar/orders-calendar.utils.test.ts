import { describe, expect, it } from "vitest";
import dayjs from "@/lib/dates/dayjs";
import { getOrdersCalendarEventRange } from "./orders-calendar.utils";

const timezone = "Europe/Madrid";

type OrdersCalendarEventRangeInput = Parameters<
	typeof getOrdersCalendarEventRange
>[0];

function createOrder(
	returnAt: string,
	pickupDate: string,
	returnDate: string,
): OrdersCalendarEventRangeInput {
	return {
		returnAt: dayjs.utc(returnAt),
		pickupDate: dayjs.utc(pickupDate),
		returnDate: dayjs.utc(returnDate),
	};
}

describe("getOrdersCalendarEventRange", () => {
	it("uses full calendar days for a same-day rental", () => {
		const range = getOrdersCalendarEventRange(
			createOrder("2026-08-13T14:00:00.000Z", "2026-08-13", "2026-08-13"),
			timezone,
		);

		expect(range).toEqual({
			startDate: "2026-08-13",
			exclusiveEndDate: "2026-08-14",
		});
	});

	it("includes a non-midnight return date in the all-day span", () => {
		const range = getOrdersCalendarEventRange(
			createOrder("2026-08-14T20:00:00.000Z", "2026-08-13", "2026-08-14"),
			timezone,
		);

		expect(range).toEqual({
			startDate: "2026-08-13",
			exclusiveEndDate: "2026-08-15",
		});
	});

	it("excludes a return date when the return is exactly local midnight", () => {
		const range = getOrdersCalendarEventRange(
			createOrder("2026-08-13T22:00:00.000Z", "2026-08-13", "2026-08-14"),
			timezone,
		);

		expect(range).toEqual({
			startDate: "2026-08-13",
			exclusiveEndDate: "2026-08-14",
		});
	});

	it("includes the return date when the return is after local midnight", () => {
		const range = getOrdersCalendarEventRange(
			createOrder("2026-08-13T22:00:00.001Z", "2026-08-13", "2026-08-14"),
			timezone,
		);

		expect(range).toEqual({
			startDate: "2026-08-13",
			exclusiveEndDate: "2026-08-15",
		});
	});
});
