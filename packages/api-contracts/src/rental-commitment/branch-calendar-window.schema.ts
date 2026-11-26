import { z } from "zod";

import { LocalDateSchema } from "../local-date.schema";

const MAX_CALENDAR_DAYS = 62;
const MILLISECONDS_PER_DAY = 86_400_000;

const CalendarDateSchema = LocalDateSchema.refine(
	(value) => !value.startsWith("0000-"),
	{ message: "Year zero is not supported." },
);

export const BranchCalendarWindowSchema = z
	.object({
		branchId: z.string().trim().min(1),
		from: CalendarDateSchema,
		to: CalendarDateSchema,
	})
	.superRefine(({ from, to }, context) => {
		if (from > to) {
			context.addIssue({
				code: "custom",
				path: ["to"],
				message: "to must be on or after from.",
			});
			return;
		}

		const inclusiveDays =
			(Date.parse(`${to}T00:00:00.000Z`) -
				Date.parse(`${from}T00:00:00.000Z`)) /
			MILLISECONDS_PER_DAY +
			1;

		if (inclusiveDays > MAX_CALENDAR_DAYS) {
			context.addIssue({
				code: "custom",
				path: ["to"],
				message: `Calendar ranges must not exceed ${MAX_CALENDAR_DAYS} inclusive days.`,
			});
		}
	});
