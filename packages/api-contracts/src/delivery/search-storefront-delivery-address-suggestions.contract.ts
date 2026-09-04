import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { AddressSuggestionSchema } from "../address-suggestion.schema";

export const SearchStorefrontDeliveryAddressSuggestionsQuerySchema = z.object({
  text: z
    .string()
    .trim()
    .refine((value) => value.replace(/\s/g, "").length >= 3, {
      message: "Text must contain at least 3 non-whitespace characters",
    }),
});

export const SearchStorefrontDeliveryAddressSuggestionsResponseSchema = z.object({
  suggestions: z.array(AddressSuggestionSchema),
});

export type SearchStorefrontDeliveryAddressSuggestionsQueryDto = z.infer<
  typeof SearchStorefrontDeliveryAddressSuggestionsQuerySchema
>;
export type SearchStorefrontDeliveryAddressSuggestionsResponseDto = z.infer<
  typeof SearchStorefrontDeliveryAddressSuggestionsResponseSchema
>;

export const searchStorefrontDeliveryAddressSuggestionsContract = {
  method: "GET",
  path: "/storefront/delivery/address-suggestions",
  query: SearchStorefrontDeliveryAddressSuggestionsQuerySchema,
  response: SearchStorefrontDeliveryAddressSuggestionsResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof SearchStorefrontDeliveryAddressSuggestionsQuerySchema,
  undefined,
  undefined,
  typeof SearchStorefrontDeliveryAddressSuggestionsResponseSchema
>;
