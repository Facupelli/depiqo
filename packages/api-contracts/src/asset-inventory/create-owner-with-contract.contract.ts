import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { ExplicitOffsetInstantWireSchema } from "../explicit-offset-instant.schema";

const SHARE_SCALE = 10n ** 30n;

function scaledShare(value: string): bigint | null {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;

  const [whole, fraction = ""] = value.split(".");
  const significantFraction = fraction.replace(/0+$/, "");
  if (significantFraction.length > 30) return null;

  const scaled = BigInt(whole) * SHARE_SCALE + BigInt(significantFraction.padEnd(30, "0") || "0");
  return scaled <= SHARE_SCALE ? scaled : null;
}

const ShareSchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d+)?$/, "Share must be a decimal string.")
  .refine((value) => scaledShare(value) !== null, "Share must be between 0 and 1 and representable exactly.");

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
    ({ contract }) => {
      const ownerShare = scaledShare(contract.ownerShare);
      const rentalShare = scaledShare(contract.rentalShare);
      return ownerShare !== null && rentalShare !== null && ownerShare + rentalShare === SHARE_SCALE;
    },
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
