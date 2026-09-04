import { z } from "zod";

import type { ApiContract } from "../api-contract";
import { AddressSuggestionSchema } from "../address-suggestion.schema";
import type { AddressSuggestionDto } from "../address-suggestion.schema";

export const SearchBranchAddressSuggestionsQuerySchema = z.object({
  text: z
    .string()
    .trim()
    .refine((value) => value.replace(/\s/g, "").length >= 3, {
      message: "Text must contain at least 3 non-whitespace characters",
    }),
});

export const BranchAddressSuggestionSchema = AddressSuggestionSchema;

export const SearchBranchAddressSuggestionsResponseSchema = z.object({
  suggestions: z.array(BranchAddressSuggestionSchema),
});

export type SearchBranchAddressSuggestionsQueryDto = z.infer<
  typeof SearchBranchAddressSuggestionsQuerySchema
>;
export type BranchAddressSuggestionDto = AddressSuggestionDto;
export type SearchBranchAddressSuggestionsResponseDto = z.infer<
  typeof SearchBranchAddressSuggestionsResponseSchema
>;

export const searchBranchAddressSuggestionsContract = {
  method: "GET",
  path: "/tenant-management/branches/address-suggestions",
  query: SearchBranchAddressSuggestionsQuerySchema,
  response: SearchBranchAddressSuggestionsResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof SearchBranchAddressSuggestionsQuerySchema,
  undefined,
  undefined,
  typeof SearchBranchAddressSuggestionsResponseSchema
>;
