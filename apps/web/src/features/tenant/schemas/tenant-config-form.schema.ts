import {
	type UpdateTenantConfigDto,
	updateTenantConfigSchema,
} from "@repo/schemas";
import { BookingMode, OrderCommunicationMode, RoundingRule } from "@repo/types";
import { z } from "zod";

const bookingModeSchema = z.enum(BookingMode);
const orderCommunicationModeSchema = z.enum(OrderCommunicationMode);

export const tenantConfigFormSchema = z
	.object({
		overRentalEnabled: z.boolean(),
		maxOverRentThreshold: z.number().nonnegative(),
		weekendCountsAsOne: z.boolean(),
		roundingRule: z.enum(RoundingRule),
		currency: z
			.string()
			.regex(/^[A-Z]{3}$/, "Must be a 3-letter ISO 4217 code"),
		locale: z.string(),
		insuranceEnabled: z.boolean(),
		insuranceRatePercent: z.number().min(0).max(100),
		timezone: z.string().min(1, "Timezone is required"),
		newArrivalsWindowDays: z.number().int().positive(),
		bookingMode: bookingModeSchema,
		orderCommunicationMode: orderCommunicationModeSchema,
		whatsAppNumber: z.string().trim().optional(),
		showFloatingWhatsAppButton: z.boolean(),
	})
	.superRefine((values, context) => {
		if (
			values.orderCommunicationMode === OrderCommunicationMode.WHATSAPP &&
			!values.whatsAppNumber
		) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "El número de WhatsApp es obligatorio en este modo.",
				path: ["whatsAppNumber"],
			});
		}
	});

export type TenantConfigFormValues = z.infer<typeof tenantConfigFormSchema>;

export const tenantConfigFormDefaults: TenantConfigFormValues = {
	overRentalEnabled: false,
	maxOverRentThreshold: 0,
	weekendCountsAsOne: false,
	roundingRule: RoundingRule.IGNORE_PARTIAL_DAY,
	currency: "ARS",
	locale: "es-AR",
	insuranceEnabled: false,
	insuranceRatePercent: 0,
	timezone: "UTC",
	newArrivalsWindowDays: 30,
	bookingMode: BookingMode.INSTANT_BOOK,
	orderCommunicationMode: OrderCommunicationMode.FORMAL,
	whatsAppNumber: undefined,
	showFloatingWhatsAppButton: false,
};

export function tenantConfigToFormValues(config: {
	pricing: {
		overRentalEnabled: boolean;
		maxOverRentThreshold: number;
		weekendCountsAsOne: boolean;
		roundingRule: RoundingRule;
		currency: string;
		locale: string;
		insuranceEnabled: boolean;
		insuranceRatePercent: number;
	};
	timezone: string;
	newArrivalsWindowDays: number;
	bookingMode: BookingMode;
	communication: {
		orderCommunicationMode: OrderCommunicationMode;
		whatsAppNumber?: string;
		showFloatingWhatsAppButton: boolean;
	};
}): TenantConfigFormValues {
	return {
		overRentalEnabled: config.pricing.overRentalEnabled,
		maxOverRentThreshold: config.pricing.maxOverRentThreshold,
		weekendCountsAsOne: config.pricing.weekendCountsAsOne,
		roundingRule: config.pricing.roundingRule,
		currency: config.pricing.currency,
		locale: config.pricing.locale,
		insuranceEnabled: config.pricing.insuranceEnabled,
		insuranceRatePercent: config.pricing.insuranceRatePercent,
		timezone: config.timezone,
		newArrivalsWindowDays: config.newArrivalsWindowDays,
		bookingMode: config.bookingMode,
		orderCommunicationMode: config.communication.orderCommunicationMode,
		whatsAppNumber: config.communication.whatsAppNumber,
		showFloatingWhatsAppButton: config.communication.showFloatingWhatsAppButton,
	};
}

export function toUpdateTenantConfigDto(
	values: TenantConfigFormValues,
): UpdateTenantConfigDto {
	const dto = {
		pricing: {
			overRentalEnabled: values.overRentalEnabled,
			maxOverRentThreshold: values.maxOverRentThreshold,
			weekendCountsAsOne: values.weekendCountsAsOne,
			roundingRule: values.roundingRule,
			currency: values.currency,
			locale: values.locale,
			insuranceEnabled: values.insuranceEnabled,
			insuranceRatePercent: values.insuranceRatePercent,
		},
		timezone: values.timezone,
		newArrivalsWindowDays: values.newArrivalsWindowDays,
		bookingMode: values.bookingMode,
		communication: {
			orderCommunicationMode: values.orderCommunicationMode,
			whatsAppNumber: values.whatsAppNumber?.trim() || undefined,
			showFloatingWhatsAppButton: values.showFloatingWhatsAppButton,
		},
	};

	return updateTenantConfigSchema.parse(dto);
}
