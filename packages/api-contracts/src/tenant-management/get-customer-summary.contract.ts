import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetCustomerSummaryParamsSchema = z.object({
  customerId: z.string().uuid(),
});

export const GetCustomerSummaryResponseSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  isActive: z.boolean(),
  isCompany: z.boolean(),
  companyName: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string(),
});

export type GetCustomerSummaryParamsDto = z.infer<typeof GetCustomerSummaryParamsSchema>;
export type GetCustomerSummaryResponseDto = z.infer<typeof GetCustomerSummaryResponseSchema>;

export const getCustomerSummaryContract = {
  method: "GET",
  path: "/tenant-management/rental-customers/:customerId",
  params: GetCustomerSummaryParamsSchema,
  response: GetCustomerSummaryResponseSchema,
} satisfies ApiContract<
  typeof GetCustomerSummaryParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetCustomerSummaryResponseSchema
>;
