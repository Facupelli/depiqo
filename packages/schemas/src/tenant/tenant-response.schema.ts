import { BookingMode, RoundingRule } from "@repo/types";
import { z } from "zod";

export const roundingRuleSchema = z.enum(RoundingRule);
export const bookingModeSchema = z.enum(BookingMode);
export const notificationChannelSchema = z.enum(["EMAIL"]);

export const tenantPricingConfigSchema = z.object({
	overRentalEnabled: z.boolean(),
	maxOverRentThreshold: z.number(),
	weekendCountsAsOne: z.boolean(),
	roundingRule: roundingRuleSchema,
	currency: z.string(),
	locale: z.string(),
	insuranceEnabled: z.boolean(),
	insuranceRatePercent: z.number().min(0).max(100),
});

export const tenantRentalConfigSchema = z.object({
	pricing: tenantPricingConfigSchema,
	bookingMode: bookingModeSchema.default(BookingMode.INSTANT_BOOK),
});

export const tenantNotificationsConfigSchema = z.object({
	enabledChannels: z.array(notificationChannelSchema),
});

export const tenantConfigSchema = z.object({
	pricing: tenantPricingConfigSchema,
	notifications: tenantNotificationsConfigSchema.default({
		enabledChannels: ["EMAIL"],
	}),
	timezone: z.string(),
	newArrivalsWindowDays: z.number().int().positive(),
	bookingMode: bookingModeSchema.default(BookingMode.INSTANT_BOOK),
});

const tenantBillingUnitResponseSchema = z.object({
	id: z.uuid(),
	billingUnitId: z.uuid(),
	label: z.string(),
	durationMinutes: z.number().int(),
	sortOrder: z.number().int(),
});

export const tenantResponseSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	slug: z.string(),
	logoUrl: z.string().nullable(),
	faviconUrl: z.string().nullable(),
	createdAt: z.coerce.date(),
	config: tenantConfigSchema,
	billingUnits: z.array(tenantBillingUnitResponseSchema),
});

export type TenantPricingConfig = z.infer<typeof tenantPricingConfigSchema>;
export type TenantRentalConfig = z.infer<typeof tenantRentalConfigSchema>;
export type TenantNotificationsConfig = z.infer<typeof tenantNotificationsConfigSchema>;
export type TenantConfig = z.infer<typeof tenantConfigSchema>;

export type TenantResponse = z.infer<typeof tenantResponseSchema>;
