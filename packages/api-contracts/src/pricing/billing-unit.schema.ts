import { z } from "zod";

export const PricingBillingUnitSchema = z.enum(["HOUR", "DAY", "WEEK"]);

export type PricingBillingUnitDto = z.infer<typeof PricingBillingUnitSchema>;
