import { z } from "zod";

import type { ApiContract } from "../api-contract";

export const GetOwnerDetailParamsSchema = z.object({
  ownerId: z.string().min(1),
});

export const GetOwnerDetailContractSchema = z.object({
  id: z.string(),
  assetId: z.string().nullable(),
  terms: z.unknown(),
  basis: z.enum(["GROSS", "NET"]),
  ownerShare: z.string(),
  rentalShare: z.string(),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const GetOwnerDetailResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  contracts: z.array(GetOwnerDetailContractSchema),
});

export type GetOwnerDetailParamsDto = z.infer<typeof GetOwnerDetailParamsSchema>;
export type GetOwnerDetailContractDto = z.infer<typeof GetOwnerDetailContractSchema>;
export type GetOwnerDetailResponseDto = z.infer<typeof GetOwnerDetailResponseSchema>;

export const getOwnerDetailContract = {
  method: "GET",
  path: "/v2/asset-inventory/owners/:ownerId",
  params: GetOwnerDetailParamsSchema,
  response: GetOwnerDetailResponseSchema,
} satisfies ApiContract<
  typeof GetOwnerDetailParamsSchema,
  undefined,
  undefined,
  undefined,
  typeof GetOwnerDetailResponseSchema
>;
