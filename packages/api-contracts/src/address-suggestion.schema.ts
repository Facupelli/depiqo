import { z } from "zod";

export const AddressSuggestionSchema = z.object({
  locationId: z.string(),
  formattedAddress: z.string(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
});

export type AddressSuggestionDto = z.infer<typeof AddressSuggestionSchema>;
