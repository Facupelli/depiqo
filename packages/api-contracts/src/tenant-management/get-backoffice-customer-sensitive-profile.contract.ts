import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { LocalDateSchema } from "../local-date.schema";

export const GetBackofficeCustomerSensitiveProfileParamsSchema = z.object({
  customerId: z.string().uuid(),
});

const ReferenceContactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  relationship: z.string(),
});

export const GetBackofficeCustomerSensitiveProfileResponseSchema = z.object({
  customerId: z.string().uuid(),
  submittedProfile: z
    .object({
      birthDate: LocalDateSchema,
      address: z.string(),
      documentNumber: z.string(),
      taxId: z.string().nullable(),
      referenceContacts: z.tuple([
        ReferenceContactSchema,
        ReferenceContactSchema,
      ]),
      rejectionReason: z.string().nullable(),
    })
    .nullable(),
});

export type GetBackofficeCustomerSensitiveProfileResponseDto = z.infer<
  typeof GetBackofficeCustomerSensitiveProfileResponseSchema
>;

export const getBackofficeCustomerSensitiveProfileContract = {
  method: "GET",
  path: "/tenant-management/rental-customers/:customerId/backoffice-sensitive-profile",
  params: GetBackofficeCustomerSensitiveProfileParamsSchema,
  response: GetBackofficeCustomerSensitiveProfileResponseSchema,
} satisfies ApiContract<
  typeof GetBackofficeCustomerSensitiveProfileParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetBackofficeCustomerSensitiveProfileResponseSchema
>;
