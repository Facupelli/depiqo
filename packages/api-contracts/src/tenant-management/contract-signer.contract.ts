import { z } from "zod";

const NullableTrimmedStringSchema = z.string().trim().min(1).nullable();

export const ContractSignerSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  documentNumber: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  signatureUrl: z.string().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ContractSignerBodySchema = z.object({
  fullName: z.string().trim().min(1),
  documentNumber: z.string().trim().min(1),
  phone: NullableTrimmedStringSchema,
  address: NullableTrimmedStringSchema,
  signatureUrl: NullableTrimmedStringSchema,
});

export const ContractSignerMutationResponseSchema = z.object({
  id: z.string(),
});

export type ContractSignerDto = z.infer<typeof ContractSignerSchema>;
export type ContractSignerBodyDto = z.infer<typeof ContractSignerBodySchema>;
export type ContractSignerMutationResponseDto = z.infer<
  typeof ContractSignerMutationResponseSchema
>;
