import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { LocalDateSchema } from "../local-date.schema";

export const GetRentalsCalendarQuerySchema = z.object({
	branchId: z.string().trim().min(1),
	from: LocalDateSchema,
	to: LocalDateSchema,
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
