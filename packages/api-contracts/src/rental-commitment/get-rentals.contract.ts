import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetRentalsDateLensSchema = z.enum(["TODAY", "UPCOMING", "ACTIVE", "PAST"]);
export const GetRentalsSortBySchema = z.enum(["createdAt", "pickupDate", "returnDate"]);
export const GetRentalsSortDirectionSchema = z.enum(["asc", "desc"]);
export const GetRentalsStatusSchema = z.enum([
  "PENDING",
  "DRAFT",
  "CONFIRMED",
  "PREPARED",
  "CANCELLED",
  "COMPLETED",
]);

const RentalStatusesQuerySchema = z
  .union([
    z.array(GetRentalsStatusSchema).min(1),
    z
      .string()
      .transform((value) =>
        value
          .split(",")
          .map((status) => status.trim())
          .filter(Boolean),
      )
      .pipe(z.array(GetRentalsStatusSchema).min(1)),
  ])
  .optional();
export const GetRentalsFulfillmentMethodSchema = z.enum(["PICKUP", "DELIVERY"]);

export const GetRentalsQuerySchema = z.object({
  branchId: z.string().trim().min(1).optional(),
  customerId: z.string().trim().min(1).optional(),
  statuses: RentalStatusesQuerySchema,
  dateLens: GetRentalsDateLensSchema.optional(),
  sortBy: GetRentalsSortBySchema.optional(),
  sortDirection: GetRentalsSortDirectionSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const GetRentalsCustomerSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  isCompany: z.boolean(),
});

export const GetRentalsItemSchema = z.object({
  id: z.string(),
  rentalNumber: z.number().int().positive(),
  status: GetRentalsStatusSchema,
  fulfillmentMethod: GetRentalsFulfillmentMethodSchema.nullable(),
  createdAt: z.iso.datetime(),
  pickupAt: z.iso.datetime(),
  returnAt: z.iso.datetime(),
  customer: GetRentalsCustomerSchema.nullable(),
  branchId: z.string(),
});

export const GetRentalsResponseSchema = z.object({
  data: z.array(GetRentalsItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export type GetRentalsDateLensDto = z.infer<typeof GetRentalsDateLensSchema>;
export type GetRentalsSortByDto = z.infer<typeof GetRentalsSortBySchema>;
export type GetRentalsSortDirectionDto = z.infer<typeof GetRentalsSortDirectionSchema>;
export type GetRentalsStatusDto = z.infer<typeof GetRentalsStatusSchema>;
export type GetRentalsFulfillmentMethodDto = z.infer<typeof GetRentalsFulfillmentMethodSchema>;
export type GetRentalsQueryDto = z.infer<typeof GetRentalsQuerySchema>;
export type GetRentalsCustomerDto = z.infer<typeof GetRentalsCustomerSchema>;
export type GetRentalsItemDto = z.infer<typeof GetRentalsItemSchema>;
export type GetRentalsResponseDto = z.infer<typeof GetRentalsResponseSchema>;

export const getRentalsContract = {
  method: "GET",
  path: "/rental-commitments/rentals",
  query: GetRentalsQuerySchema,
  response: GetRentalsResponseSchema,
} satisfies ApiContract<undefined, typeof GetRentalsQuerySchema, undefined, undefined, typeof GetRentalsResponseSchema>;
