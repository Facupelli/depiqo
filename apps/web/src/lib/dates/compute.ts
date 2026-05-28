import type { Dayjs } from "dayjs";

export function addDays(date: Dayjs, amount: number): Dayjs {
	return date.add(amount, "day");
}

/**
 * Number of nights between two daily bounds.
 * Uses day-level diff — time component is irrelevant.
 */
export function countNights(start: Dayjs, end: Dayjs): number {
	return end.utc().startOf("day").diff(start.utc().startOf("day"), "day");
}
