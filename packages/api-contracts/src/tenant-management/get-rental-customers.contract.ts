import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const RentalCustomerOnboardingStatusSchema = z.enum([
  "NOT_STARTED",
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const GetRentalCustomersQuerySchema = z.object({
  status: RentalCustomerOnboardingStatusSchema.optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const GetRentalCustomersItemSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  status: RentalCustomerOnboardingStatusSchema,
  createdAt: z.string().datetime(),
});

export const GetRentalCustomersResponseSchema = z.object({
  data: z.array(GetRentalCustomersItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type RentalCustomerOnboardingStatusDto = z.infer<typeof RentalCustomerOnboardingStatusSchema>;
export type GetRentalCustomersQueryDto = z.infer<typeof GetRentalCustomersQuerySchema>;
export type GetRentalCustomersItemDto = z.infer<typeof GetRentalCustomersItemSchema>;
export type GetRentalCustomersResponseDto = z.infer<typeof GetRentalCustomersResponseSchema>;

export const getRentalCustomersContract = {
  method: "GET",
  path: "/tenant-management/rental-customers",
  query: GetRentalCustomersQuerySchema,
  response: GetRentalCustomersResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetRentalCustomersQuerySchema,
  undefined,
  undefined,
  typeof GetRentalCustomersResponseSchema
>;
