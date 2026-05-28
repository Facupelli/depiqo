import {
	type AddScheduleToLocationDto,
	addScheduleToLocationSchema,
	type LocationScheduleResponseDto,
} from "@repo/schemas";
import dayjs from "dayjs";
import { z } from "zod";

export function minutesToTimeString(minutes: number): string {
	return dayjs().startOf("day").add(minutes, "minute").format("HH:mm");
}

export function timeStringToMinutes(time: string): number {
	const [hours, mins] = time.split(":").map(Number);
	return hours * 60 + mins;
}

export const scheduleSlotFormSchema = z
	.object({
		type: z.enum(["PICKUP", "RETURN"]),
		mode: z.enum(["weekly", "specific"]),

		daysOfWeek: z.array(z.number().int().min(0).max(6)),

		specificDate: z.string().nullable(),

		openTime: z.string().regex(/^\d{2}:\d{2}$/, "Enter a valid time (HH:mm)"),
		closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Enter a valid time (HH:mm)"),

		slotIntervalMinutes: z.number().int().positive().nullable(),
	})
	.refine(
		(data) => {
			if (data.mode === "weekly") return data.daysOfWeek.length > 0;
			return data.specificDate !== null && data.specificDate.length > 0;
		},
		{
			message: "Select at least one day or provide a specific date.",
			path: ["daysOfWeek"],
		},
	)
	.refine(
		(data) =>
			timeStringToMinutes(data.openTime) <= timeStringToMinutes(data.closeTime),
		{
			message: "Open time must be before or equal to close time.",
			path: ["openTime"],
		},
	)
	.refine(
		(data) => {
			const isFixedHour =
				timeStringToMinutes(data.openTime) ===
				timeStringToMinutes(data.closeTime);
			const hasInterval = data.slotIntervalMinutes !== null;
			return isFixedHour !== hasInterval;
		},
		{
			message:
				"Fixed-hour schedules must have no interval. Windowed schedules must have an interval.",
			path: ["slotIntervalMinutes"],
		},
	);

export type ScheduleSlotFormValues = z.infer<typeof scheduleSlotFormSchema>;

export function getScheduleSlotDefaults(opts: {
	type: "PICKUP" | "RETURN";
	mode: "weekly" | "specific";
	daysOfWeek?: number[];
	specificDate?: string;
}): ScheduleSlotFormValues {
	return {
		type: opts.type,
		mode: opts.mode,
		daysOfWeek: opts.daysOfWeek ?? [],
		specificDate: opts.specificDate ?? null,
		openTime: "08:00",
		closeTime: "18:00",
		slotIntervalMinutes: 30,
	};
}

export function scheduleToFormValues(
	schedule: LocationScheduleResponseDto,
): ScheduleSlotFormValues {
	return {
		type: schedule.type,
		mode: schedule.dayOfWeek !== null ? "weekly" : "specific",
		daysOfWeek: schedule.dayOfWeek !== null ? [schedule.dayOfWeek] : [],
		specificDate:
			schedule.specificDate !== null
				? dayjs(schedule.specificDate).format("YYYY-MM-DD")
				: null,
		openTime: minutesToTimeString(schedule.openTime),
		closeTime: minutesToTimeString(schedule.closeTime),
		slotIntervalMinutes: schedule.slotIntervalMinutes,
	};
}

export function toAddScheduleDtos(
	values: ScheduleSlotFormValues,
): AddScheduleToLocationDto[] {
	const openTime = timeStringToMinutes(values.openTime);
	const closeTime = timeStringToMinutes(values.closeTime);

	if (values.mode === "specific") {
		return [
			addScheduleToLocationSchema.parse({
				type: values.type,
				dayOfWeek: null,
				specificDate: values.specificDate,
				openTime,
				closeTime,
				slotIntervalMinutes: values.slotIntervalMinutes,
			}),
		];
	}

	return values.daysOfWeek.map((day) =>
		addScheduleToLocationSchema.parse({
			type: values.type,
			dayOfWeek: day,
			specificDate: null,
			openTime,
			closeTime,
			slotIntervalMinutes: values.slotIntervalMinutes,
		}),
	);
}
