import { z } from "zod";

export const BranchOperationalLocationSchema = z.object({
  formattedAddress: z.string().trim().min(1),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  street: z.string().nullable().optional(),
  streetNumber: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  stateRegion: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  providerPlaceId: z.string().nullable().optional(),
});

export type BranchOperationalLocationDto = z.infer<
  typeof BranchOperationalLocationSchema
>;
