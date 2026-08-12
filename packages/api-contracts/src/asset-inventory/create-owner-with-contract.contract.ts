import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";

const ShareSchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d+)?$/, "Share must be a decimal string.")
  .refine(
    (value) => Number(value) >= 0 && Number(value) <= 1,
    "Share must be between 0 and 1.",
  );

export const CreateOwnerWithContractBodySchema = z
  .object({
    owner: z.object({
      name: z.string().trim().min(1),
    }),
    contract: z.object({
      basis: z.enum(["GROSS", "NET"]),
      ownerShare: ShareSchema,
      rentalShare: ShareSchema,
      validFrom: ExplicitOffsetInstantWireSchema,
      validTo: ExplicitOffsetInstantWireSchema.optional().nullable(),
    }),
  })
  .refine(
    ({ contract }) =>
      Math.abs(Number(contract.ownerShare) + Number(contract.rentalShare) - 1) <
      1e-10,
    {
      message: "ownerShare and rentalShare must sum to exactly 1.",
      path: ["contract", "rentalShare"],
    },
  );

export const CreateOwnerWithContractResponseSchema = z.object({
  ownerId: z.string(),
  contractId: z.string(),
});

export type CreateOwnerWithContractBodyDto = z.input<
  typeof CreateOwnerWithContractBodySchema
>;
export type CreateOwnerWithContractResponseDto = z.infer<
  typeof CreateOwnerWithContractResponseSchema
>;

export const createOwnerWithContractContract = {
  method: "POST",
  path: "/asset-inventory/owners",
  body: CreateOwnerWithContractBodySchema,
  response: CreateOwnerWithContractResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  typeof CreateOwnerWithContractBodySchema,
  typeof CreateOwnerWithContractResponseSchema
>;
