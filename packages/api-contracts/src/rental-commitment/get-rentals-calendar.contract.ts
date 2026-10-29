import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { LocalDateSchema } from "../local-date.schema";

const MAX_CALENDAR_DAYS = 62;
const MILLISECONDS_PER_DAY = 86_400_000;

// PostgreSQL calendar-date casts do not support ISO year zero.
const CalendarDateSchema = LocalDateSchema.refine(
	(value) => !value.startsWith("0000-"),
	{ message: "Year zero is not supported." },
);

export const GetRentalsCalendarQuerySchema = z
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

		// Count inclusive calendar dates, not elapsed hours in the branch timezone.
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

export const GetRentalsCalendarStatusSchema = z.enum([
	"PENDING",
	"DRAFT",
	"CONFIRMED",
]);

export const GetRentalsCalendarCustomerSchema = z.object({
	id: z.string(),
	displayName: z.string(),
	isCompany: z.boolean(),
});

export const GetRentalsCalendarItemSchema = z.object({
	id: z.string(),
	rentalNumber: z.number().int().positive(),
	status: GetRentalsCalendarStatusSchema,
	createdAt: z.iso.datetime(),
	pickupAt: z.iso.datetime(),
	returnAt: z.iso.datetime(),
	pickupDate: LocalDateSchema,
	returnDate: LocalDateSchema,
	customer: GetRentalsCalendarCustomerSchema.nullable(),
});

export const GetRentalsCalendarResponseSchema = z.array(
	GetRentalsCalendarItemSchema,
);

export type GetRentalsCalendarQueryDto = z.infer<
	typeof GetRentalsCalendarQuerySchema
>;
export type GetRentalsCalendarStatusDto = z.infer<
	typeof GetRentalsCalendarStatusSchema
>;
export type GetRentalsCalendarCustomerDto = z.infer<
	typeof GetRentalsCalendarCustomerSchema
>;
export type GetRentalsCalendarItemDto = z.infer<
	typeof GetRentalsCalendarItemSchema
>;
export type GetRentalsCalendarResponseDto = z.infer<
	typeof GetRentalsCalendarResponseSchema
>;

export const getRentalsCalendarContract = {
	method: "GET",
	path: "/rental-commitments/rentals/calendar",
	query: GetRentalsCalendarQuerySchema,
	response: GetRentalsCalendarResponseSchema,
} satisfies ApiContract<
	undefined,
	typeof GetRentalsCalendarQuerySchema,
	undefined,
	undefined,
	typeof GetRentalsCalendarResponseSchema
>;
