import { z } from "zod";

export const SupportedPricingCurrencySchema = z.string().trim().toUpperCase().refine(
  (value) => ["ARS", "EUR", "USD"].includes(value),
  "Pricing supports ARS, EUR, and USD",
);
