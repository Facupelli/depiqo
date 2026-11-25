import { z } from "zod";

export const DraftRentalRoutedDestinationSchema = z.object({
  arrangement: z.literal("ROUTED").optional(),
  address: z.string().trim().min(1),
  locationId: z.string().trim().min(1),
});

export const DraftRentalStaffArrangedDestinationSchema = z.strictObject({
  arrangement: z.literal("STAFF_ARRANGED"),
  address: z.string().trim().min(1),
  // Optional client information, not verified routing data or authorization.
  geocoding: z
    .strictObject({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      formattedAddress: z.string().trim().min(1).optional(),
      providerPlaceId: z.string().trim().min(1).optional(),
    })
    .optional(),
});
