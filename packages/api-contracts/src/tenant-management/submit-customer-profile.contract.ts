import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { LocalDateSchema } from "../local-date.schema";

export const SubmitCustomerProfileBodySchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  birthDate: LocalDateSchema,
  documentNumber: z.string().min(1),
  identityDocumentPath: z.string().min(1),

  address: z.string().min(1),
  city: z.string().min(1),
  stateRegion: z.string().min(1),
  country: z.string().min(1),

  occupation: z.string(),
  company: z.string().min(1).optional(),
  taxId: z.string().min(1).optional(),
  businessName: z.string().min(1).optional(),

  bankName: z.string(),
  accountNumber: z.string(),

  instagram: z.string().min(1).optional(),
  knowsExistingCustomer: z.boolean().optional(),
  knownCustomerName: z.string().min(1).optional(),

  contact1Name: z.string().min(1),
  contact1Phone: z.string().min(1),
  contact1Relationship: z.string().min(1),
  contact2Name: z.string(),
  contact2Phone: z.string(),
  contact2Relationship: z.string(),
});

export const SubmitCustomerProfileResponseSchema = z.object({
  id: z.string(),
});

export type SubmitCustomerProfileBodyDto = z.infer<typeof SubmitCustomerProfileBodySchema>;
export type SubmitCustomerProfileResponseDto = z.infer<typeof SubmitCustomerProfileResponseSchema>;

export const submitCustomerProfileContract = {
  method: "POST",
  path: "/tenant-management/customer/profile/submit",
  body: SubmitCustomerProfileBodySchema,
  response: SubmitCustomerProfileResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof SubmitCustomerProfileBodySchema, typeof SubmitCustomerProfileResponseSchema>;
