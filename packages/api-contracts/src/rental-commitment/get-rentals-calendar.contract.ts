import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetRentalsCalendarQuerySchema = z.object({
	branchId: z.string().trim().min(1),
	from: z.coerce.date(),
	to: z.coerce.date(),
});

export const GetRentalsCalendarStatusSchema = z.enum([
	"PENDING",
	"DRAFT",
	"CONFIRMED",
	"PREPARED",
]);

export const GetRentalsCalendarCustomerSchema = z.object({
	id: z.string(),
	displayName: z.string(),
	isCompany: z.boolean(),
});

export const GetRentalsCalendarItemSchema = z.object({
	id: z.string(),
	number: z.string(),
	status: GetRentalsCalendarStatusSchema,
	createdAt: z.iso.datetime(),
	pickupAt: z.iso.datetime(),
	returnAt: z.iso.datetime(),
	pickupDate: z.string(),
	returnDate: z.string(),
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
	path: "/v2/rental-commitments/rentals/calendar",
	query: GetRentalsCalendarQuerySchema,
	response: GetRentalsCalendarResponseSchema,
} satisfies ApiContract<
	undefined,
	typeof GetRentalsCalendarQuerySchema,
	undefined,
	undefined,
	typeof GetRentalsCalendarResponseSchema
>;
