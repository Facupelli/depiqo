import type { AssetUnavailabilityPeriod } from "@repo/api-contracts";
import { describe, expect, it } from "vitest";
import {
	getPeriodStatus,
	periodFormDefaults,
	periodFormSchema,
} from "./temporary-unavailability.schema";

const period: AssetUnavailabilityPeriod = {
	id: "95dd2db3-6397-4275-976f-7770997d8ae2",
	startsAt: "2026-11-26T00:49:43.040Z",
	endsAt: "2026-11-26T05:00:00.000Z",
	createdAt: "2026-11-26T00:49:43.040Z",
	cancelledAt: null,
	reason: "Maintenance",
};
const timezone = "Europe/Madrid";

describe("temporary unavailability", () => {
	it("derives history status at exact boundaries with cancellation taking precedence", () => {
		const start = Date.parse(period.startsAt);
		const end = Date.parse(period.endsAt);
		expect(getPeriodStatus(period, start - 1)).toBe("scheduled");
		expect(getPeriodStatus(period, start)).toBe("in-progress");
		expect(getPeriodStatus(period, end)).toBe("completed");
		expect(
			getPeriodStatus({ ...period, cancelledAt: period.createdAt }, end),
		).toBe("cancelled");
	});

	it("uses the supplied branch timezone and omits the start for immediate downtime", () => {
		const schema = periodFormSchema({ kind: "schedule" }, timezone);
		const values = {
			startNow: false,
			startsAt: "2026-11-26T08:30",
			endsAt: "2026-11-26T09:00",
			reason: " Inspection ",
		};
		expect(schema.parse(values)).toEqual({
			kind: "schedule",
			body: {
				startsAt: "2026-11-26T07:30:00.000Z",
				endsAt: "2026-11-26T08:00:00.000Z",
				reason: "Inspection",
			},
		});
		expect(schema.parse({ ...values, startNow: true }).body).toEqual({
			endsAt: "2026-11-26T08:00:00.000Z",
			reason: "Inspection",
		});
	});

	it("preserves the exact original start and reason when changing an active period's end", () => {
		const editor = { kind: "change-end", period } as const;
		const values = periodFormDefaults(editor, timezone);
		expect(values.startsAt).toBe("2026-11-26T01:49");
		expect(
			periodFormSchema(editor, timezone).parse({
				...values,
				startsAt: "",
				reason: "",
				endsAt: "2026-11-26T06:30",
			}),
		).toEqual({
			kind: "reschedule",
			periodId: period.id,
			body: {
				startsAt: period.startsAt,
				endsAt: "2026-11-26T05:30:00.000Z",
				reason: period.reason,
			},
		});
	});

	it("rejects times in a daylight saving gap and an end at or before the start", () => {
		const schema = periodFormSchema({ kind: "schedule" }, timezone);
		const values = {
			startNow: false,
			startsAt: "2026-03-29T02:30",
			endsAt: "2026-03-29T04:30",
			reason: "Inspection",
		};
		expect(
			schema.safeParse(values).error?.issues.map((issue) => issue.path),
		).toEqual([["startsAt"]]);
		expect(
			schema
				.safeParse({ ...values, startsAt: values.endsAt })
				.error?.issues.map((issue) => issue.path),
		).toEqual([["endsAt"]]);
	});
});
