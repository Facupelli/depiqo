import { describe, expect, it } from "vitest";
import {
	demoPeriodsOverlap,
	getDemoCalendar,
	getDemoMonth,
} from "./reservation-demo";

describe("marketing reservation demo", () => {
	it("uses the next month, including the year rollover", () => {
		expect(getDemoMonth(new Date("2026-11-30T23:59:59Z"))).toBe("2026-12");
		expect(getDemoMonth(new Date("2026-12-31T23:59:59Z"))).toBe("2027-01");
	});

	it("formats Spanish dates from a serialized month", () => {
		const calendar = getDemoCalendar("2027-01");
		expect(calendar.monthLabel).toBe("Enero de 2027");
		expect(calendar.year).toBe(2027);
		expect(calendar.periods.map((period) => period.label)).toEqual([
			"5–8 ene",
			"7–10 ene",
			"12–14 ene",
		]);
	});

	it("blocks the selected and overlapping periods, but permits a separate booking", () => {
		const { periods } = getDemoCalendar("2026-12");
		expect(demoPeriodsOverlap(periods[0], periods[0])).toBe(true);
		expect(demoPeriodsOverlap(periods[0], periods[1])).toBe(true);
		expect(demoPeriodsOverlap(periods[1], periods[0])).toBe(true);
		expect(demoPeriodsOverlap(periods[0], periods[2])).toBe(false);
		expect(demoPeriodsOverlap(periods[1], periods[2])).toBe(false);
	});

	it("treats shared end days as occupied in this illustrative demo", () => {
		expect(
			demoPeriodsOverlap(
				{ start: 5, end: 8, label: "" },
				{ start: 8, end: 10, label: "" },
			),
		).toBe(true);
	});
});
