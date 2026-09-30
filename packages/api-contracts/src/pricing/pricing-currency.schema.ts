import { z } from "zod";

// Pricing currently settles payable charges at two decimal places.
export const SupportedPricingCurrencySchema = z.string().trim().toUpperCase().refine(
  (value) => ["ARS", "EUR", "USD"].includes(value),
  "Pricing supports ARS, EUR, and USD",
);
