import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { RentalCustomerOnboardingStatusSchema } from "./get-rental-customers.contract";

export const GetBackofficeCustomerProfileParamsSchema = z.object({
  customerId: z.string().uuid(),
});

export const GetBackofficeCustomerProfileResponseSchema = z.object({
  id: z.string(),
  primaryName: z.string().nullable(),
  companyName: z.string().nullable(),
  contactName: z.string().nullable(),
  isCompany: z.boolean(),
  email: z.string().email(),
  phone: z.string().nullable(),
  isActive: z.boolean(),
  onboardingStatus: RentalCustomerOnboardingStatusSchema,
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  lastSubmittedAt: z.string().datetime().nullable(),
  lastLoginAt: z.string().datetime().nullable(),
  authenticationMethods: z.array(z.enum(["PASSWORD", "GOOGLE"])),
  identityDocumentOnFile: z.boolean(),
  submittedProfile: z.object({
    occupation: z.string(),
    employer: z.string().nullable(),
    instagram: z.string().nullable(),
    knowsExistingCustomer: z.boolean(),
    city: z.string(),
    stateRegion: z.string(),
    country: z.string(),
    reviewedAt: z.string().datetime().nullable(),
    reviewerLabel: z.string().nullable(),
  }).nullable(),
});

export type GetBackofficeCustomerProfileResponseDto = z.infer<typeof GetBackofficeCustomerProfileResponseSchema>;

export const getBackofficeCustomerProfileContract = {
  method: "GET",
  path: "/tenant-management/rental-customers/:customerId/backoffice-profile",
  params: GetBackofficeCustomerProfileParamsSchema,
  response: GetBackofficeCustomerProfileResponseSchema,
} satisfies ApiContract<
  typeof GetBackofficeCustomerProfileParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetBackofficeCustomerProfileResponseSchema
>;
