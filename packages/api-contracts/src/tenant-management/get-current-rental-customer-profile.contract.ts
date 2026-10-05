import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { LocalDateSchema } from "../local-date.schema";
import { RentalCustomerOnboardingStatusSchema } from "./get-rental-customers.contract";

export const CurrentRentalCustomerProfileProfileSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  birthDate: LocalDateSchema,
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

export const GetCurrentRentalCustomerProfileResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  isCompany: z.boolean(),
  companyName: z.string().nullable(),
  isActive: z.boolean(),
  onboardingStatus: RentalCustomerOnboardingStatusSchema,
  lastSubmittedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  profile: CurrentRentalCustomerProfileProfileSchema,
});

export type CurrentRentalCustomerProfileProfileDto = z.infer<typeof CurrentRentalCustomerProfileProfileSchema>;
export type GetCurrentRentalCustomerProfileResponseDto = z.infer<typeof GetCurrentRentalCustomerProfileResponseSchema>;

export const getCurrentRentalCustomerProfileContract = {
  method: "GET",
  path: "/tenant-management/rental-customers/me/profile",
  response: GetCurrentRentalCustomerProfileResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  undefined,
  typeof GetCurrentRentalCustomerProfileResponseSchema
>;
