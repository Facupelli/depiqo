import { describe, expect, it } from "vitest";
import {
	dateParamToLocalDate,
	hydrateRentalPeriod,
	isRentalPeriodChronological,
	localDateToDateParam,
	minuteOfDayToTime,
	resolveRentalPeriod,
	timeToMinuteOfDay,
} from "./rental-period";

describe("rental period conversions", () => {
	it("hydrates absolute instants into branch-local values", () => {
		expect(
			hydrateRentalPeriod(
				"2025-01-15T12:30:00.000Z",
				"2025-01-16T00:15:00.000Z",
				"America/Argentina/Buenos_Aires",
			),
		).toEqual({
			startDate: "2025-01-15",
			startTime: 9 * 60 + 30,
			endDate: "2025-01-15",
			endTime: 21 * 60 + 15,
		});
	});

	it("resolves branch-local values into absolute instants", () => {
		const resolution = resolveRentalPeriod(
			{
				startDate: "2025-01-15",
				startTime: 9 * 60,
				endDate: "2025-01-15",
				endTime: 18 * 60,
			},
			"America/Argentina/Buenos_Aires",
		);

		expect(resolution.kind).toBe("resolved");
		if (resolution.kind !== "resolved") return;
		expect(resolution.period.start.toISOString()).toBe(
			"2025-01-15T12:00:00.000Z",
		);
		expect(resolution.period.end.toISOString()).toBe(
			"2025-01-15T21:00:00.000Z",
		);
	});

	it("compares chronology using resolved absolute instants", () => {
		const resolution = resolveRentalPeriod(
			{
				startDate: "2025-03-08",
				startTime: 23 * 60,
				endDate: "2025-03-09",
				endTime: 30,
			},
			"America/New_York",
		);

		expect(resolution.kind).toBe("resolved");
		if (resolution.kind !== "resolved") return;
		expect(isRentalPeriodChronological(resolution.period)).toBe(true);
	});

	it("reports a nonexistent DST local time", () => {
		expect(
			resolveRentalPeriod(
				{
					startDate: "2025-03-09",
					startTime: 2 * 60 + 30,
					endDate: "2025-03-09",
					endTime: 4 * 60,
				},
				"America/New_York",
			),
		).toEqual({ kind: "nonexistent", endpoint: "start" });
	});

	it("preserves the earlier occurrence for an ambiguous DST local time", () => {
		const resolution = resolveRentalPeriod(
			{
				startDate: "2025-11-02",
				startTime: 1 * 60 + 30,
				endDate: "2025-11-02",
				endTime: 2 * 60 + 30,
			},
			"America/New_York",
		);

		expect(resolution.kind).toBe("resolved");
		if (resolution.kind !== "resolved") return;
		expect(resolution.period.start.toISOString()).toBe(
			"2025-11-02T05:30:00.000Z",
		);
	});

	it("converts date-only values without shifting the calendar date", () => {
		const date = dateParamToLocalDate("2025-02-03");
		expect(date).toBeDefined();
		expect(localDateToDateParam(date as Date)).toBe("2025-02-03");
		expect(dateParamToLocalDate("2025-02-30")).toBeUndefined();
		expect(dateParamToLocalDate("03/02/2025")).toBeUndefined();
	});

	it("converts minute-of-day values and time input strings", () => {
		expect(minuteOfDayToTime(9 * 60 + 5)).toBe("09:05");
		expect(timeToMinuteOfDay("09:05")).toBe(9 * 60 + 5);
		expect(timeToMinuteOfDay("24:00")).toBeNull();
		expect(timeToMinuteOfDay("9:05")).toBeNull();
	});
});
