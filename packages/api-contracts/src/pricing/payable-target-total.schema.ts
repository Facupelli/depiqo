import { z } from "zod";

// A target is a positive amount exactly representable in cents. Trailing
// zeroes beyond two places do not change its monetary value.
export const PayableTargetTotalSchema = z.string().trim().regex(/^\d+(?:\.\d+)?$/).refine(
  (value) => /[1-9]/.test(value) && /^\d+(?:\.\d{1,2}0*)?$/.test(value),
  "Enter a positive amount exactly representable in cents",
);
