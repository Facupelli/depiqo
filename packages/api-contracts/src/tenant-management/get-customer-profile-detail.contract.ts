import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { RentalCustomerOnboardingStatusSchema } from "./get-rental-customers.contract";

export const GetCustomerProfileDetailParamsSchema = z.object({
  customerId: z.string().uuid(),
});

export const CustomerProfileDetailProfileSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  birthDate: z.string(),
  documentNumber: z.string(),
  identityDocumentPath: z.string(),
  address: z.string(),
  city: z.string(),
  stateRegion: z.string(),
  country: z.string(),
  occupation: z.string(),
  company: z.string().nullable(),
  taxId: z.string().nullable(),
  businessName: z.string().nullable(),
  bankName: z.string(),
  accountNumber: z.string(),
  instagram: z.string().nullable(),
  knowsExistingCustomer: z.boolean(),
  knownCustomerName: z.string().nullable(),
  contact1Name: z.string(),
  contact1Phone: z.string(),
  contact1Relationship: z.string(),
  contact2Name: z.string(),
  contact2Phone: z.string(),
  contact2Relationship: z.string(),
  rejectionReason: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  reviewedById: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const GetCustomerProfileDetailResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  isCompany: z.boolean(),
  companyName: z.string().nullable(),
  isActive: z.boolean(),
  onboardingStatus: RentalCustomerOnboardingStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  profile: CustomerProfileDetailProfileSchema,
});

export type GetCustomerProfileDetailParamsDto = z.infer<typeof GetCustomerProfileDetailParamsSchema>;
export type CustomerProfileDetailProfileDto = z.infer<typeof CustomerProfileDetailProfileSchema>;
export type GetCustomerProfileDetailResponseDto = z.infer<typeof GetCustomerProfileDetailResponseSchema>;

export const getCustomerProfileDetailContract = {
  method: "GET",
  path: "/v2/tenant-management/rental-customers/:customerId/profile",
  params: GetCustomerProfileDetailParamsSchema,
  response: GetCustomerProfileDetailResponseSchema,
} satisfies ApiContract<
  typeof GetCustomerProfileDetailParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetCustomerProfileDetailResponseSchema
>;
