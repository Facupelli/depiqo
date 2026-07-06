import { z } from "zod";

import type { ApiContract } from "../api-contract";

const ShareSchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d+)?$/, "Share must be a decimal string.")
  .refine((value) => Number(value) >= 0 && Number(value) <= 1, "Share must be between 0 and 1.");

export const CreateOwnerWithContractBodySchema = z
  .object({
    owner: z.object({
      name: z.string().trim().min(1),
    }),
    contract: z.object({
      basis: z.enum(["GROSS", "NET"]),
      ownerShare: ShareSchema,
      rentalShare: ShareSchema,
      validFrom: z.string().datetime(),
      validTo: z.string().datetime().optional().nullable(),
    }),
  })
  .refine(
    ({ contract }) => Math.abs(Number(contract.ownerShare) + Number(contract.rentalShare) - 1) < 1e-10,
    {
      message: "ownerShare and rentalShare must sum to exactly 1.",
      path: ["contract", "rentalShare"],
    },
  )
  .refine(
    ({ contract }) =>
      contract.validTo === undefined ||
      contract.validTo === null ||
      Date.parse(contract.validTo) > Date.parse(contract.validFrom),
    {
      message: "validTo must be after validFrom.",
      path: ["contract", "validTo"],
    },
  );

export const CreateOwnerWithContractResponseSchema = z.object({
  ownerId: z.string(),
  contractId: z.string(),
});

export type CreateOwnerWithContractBodyDto = z.infer<typeof CreateOwnerWithContractBodySchema>;
export type CreateOwnerWithContractResponseDto = z.infer<typeof CreateOwnerWithContractResponseSchema>;

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
