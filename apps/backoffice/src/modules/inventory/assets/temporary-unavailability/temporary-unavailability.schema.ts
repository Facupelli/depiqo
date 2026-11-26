import {
	type AssetUnavailabilityPeriod,
	AssetUnavailabilityReasonSchema,
} from "@repo/api-contracts";
import { resolveLocalDateTime } from "@repo/temporal";
import { z } from "zod";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import type { UnavailabilityChange } from "./temporary-unavailability.api";

export type PeriodStatus =
	| "scheduled"
	| "in-progress"
	| "completed"
	| "cancelled";

export function getPeriodStatus(
	period: AssetUnavailabilityPeriod,
	now: number,
): PeriodStatus {
	if (period.cancelledAt) return "cancelled";
	if (Date.parse(period.endsAt) <= now) return "completed";
	return Date.parse(period.startsAt) > now ? "scheduled" : "in-progress";
}

export type PeriodEditor =
	| { kind: "schedule" }
	| { kind: "reschedule" | "change-end"; period: AssetUnavailabilityPeriod };

function toLocalInput(value: string, timezone: string) {
	return formatTimestampInTimezone(value, timezone, "YYYY-MM-DDTHH:mm");
}

export function periodFormDefaults(editor: PeriodEditor, timezone: string) {
	if (editor.kind === "schedule")
		return { startNow: false, startsAt: "", endsAt: "", reason: "" };
	const { startsAt, endsAt, reason } = editor.period;
	return {
		startNow: false,
		startsAt: toLocalInput(startsAt, timezone),
		endsAt: toLocalInput(endsAt, timezone),
		reason,
	};
}

function toInstant(value: string, timezone: string, original?: string) {
	if (original && value === toLocalInput(original, timezone)) return original;
	const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
	if (!match || !z.iso.date().safeParse(match[1]).success) return undefined;
	const result = resolveLocalDateTime({
		localDate: match[1],
		minuteOfDay: Number(match[2]) * 60 + Number(match[3]),
		timeZone: timezone,
	});
	return result.kind === "resolved" ? result.instant.toISOString() : undefined;
}

export function periodFormSchema(editor: PeriodEditor, timezone: string) {
	return z
		.object({
			startNow: z.boolean(),
			startsAt: z.string(),
			endsAt: z.string(),
			reason: z.string(),
		})
		.transform(
			(
				values,
				ctx,
			): Extract<UnavailabilityChange, { kind: "schedule" | "reschedule" }> => {
				const original = editor.kind === "schedule" ? undefined : editor.period;
				const startNow = editor.kind === "schedule" && values.startNow;
				const startsAt =
					editor.kind === "change-end"
						? editor.period.startsAt
						: startNow
							? undefined
							: toInstant(values.startsAt, timezone, original?.startsAt);
				const endsAt = toInstant(values.endsAt, timezone, original?.endsAt);
				const reason = AssetUnavailabilityReasonSchema.safeParse(values.reason);
				const invalid = (path: string, message: string) =>
					ctx.addIssue({ code: "custom", path: [path], message });
				if (!startsAt && !startNow)
					invalid(
						"startsAt",
						"Ingresá una fecha y hora de inicio válida en esta zona horaria.",
					);
				if (!endsAt)
					invalid(
						"endsAt",
						"Ingresá una fecha y hora de fin válida en esta zona horaria.",
					);
				else if (startsAt && Date.parse(endsAt) <= Date.parse(startsAt))
					invalid("endsAt", "El fin debe ser posterior al inicio.");
				if (!reason.success && editor.kind !== "change-end")
					invalid("reason", "Ingresá un motivo de hasta 500 caracteres.");
				if (
					!endsAt ||
					(!startNow && !startsAt) ||
					(!reason.success && editor.kind !== "change-end")
				)
					return z.NEVER;
				if (editor.kind === "schedule")
					return {
						kind: "schedule",
						body: {
							...(startsAt && { startsAt }),
							endsAt,
							reason: values.reason.trim(),
						},
					};
				return {
					kind: "reschedule",
					periodId: editor.period.id,
					body: {
						startsAt: startsAt ?? editor.period.startsAt,
						endsAt,
						reason:
							editor.kind === "change-end"
								? editor.period.reason
								: values.reason.trim(),
					},
				};
			},
		);
}
