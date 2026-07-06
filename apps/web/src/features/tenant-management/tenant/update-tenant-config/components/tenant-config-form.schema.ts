import {
	TenantBookingModeSchema,
	type TenantConfigDto,
	TenantOrderCommunicationModeSchema,
	TenantRoundingRuleSchema,
	type UpdateTenantConfigBodyDto,
	UpdateTenantConfigBodySchema,
} from "@repo/api-contracts";
import { BookingMode, OrderCommunicationMode, RoundingRule } from "@repo/types";
import { z } from "zod";

export const tenantConfigFormSchema = z
	.object({
		overRentalEnabled: z.boolean(),
		maxOverRentThreshold: z.number().nonnegative(),
		weekendCountsAsOne: z.boolean(),
		roundingRule: TenantRoundingRuleSchema,
		currency: z
			.string()
			.regex(/^[A-Z]{3}$/, "Debe ser un código ISO 4217 de 3 letras"),
		locale: z.string().min(1, "El locale es obligatorio"),
		insuranceEnabled: z.boolean(),
		insuranceRatePercent: z.number().min(0).max(100),
		timezone: z.string().min(1, "La zona horaria es obligatoria"),
		newArrivalsWindowDays: z.number().int().positive(),
		bookingMode: TenantBookingModeSchema,
		orderCommunicationMode: TenantOrderCommunicationModeSchema,
		whatsAppNumber: z.string(),
		showFloatingWhatsAppButton: z.boolean(),
	})
	.superRefine((values, context) => {
		if (
			values.orderCommunicationMode === OrderCommunicationMode.WHATSAPP &&
			!values.whatsAppNumber.trim()
		) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "El número de WhatsApp es obligatorio en este modo.",
				path: ["whatsAppNumber"],
			});
		}
	});

export type TenantConfigFormValues = z.infer<typeof tenantConfigFormSchema>;

export function createTenantConfigFormDefaultValues(): TenantConfigFormValues {
	return {
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
		whatsAppNumber: "",
		showFloatingWhatsAppButton: false,
	};
}

export function tenantConfigToFormValues(
	config: TenantConfigDto,
): TenantConfigFormValues {
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
		whatsAppNumber: config.communication.whatsAppNumber ?? "",
		showFloatingWhatsAppButton: config.communication.showFloatingWhatsAppButton,
	};
}

export function toUpdateTenantConfigDto(
	values: TenantConfigFormValues,
): UpdateTenantConfigBodyDto {
	const parsedValues = tenantConfigFormSchema.parse(values);
	const dto: UpdateTenantConfigBodyDto = {
		pricing: {
			overRentalEnabled: parsedValues.overRentalEnabled,
			maxOverRentThreshold: parsedValues.maxOverRentThreshold,
			weekendCountsAsOne: parsedValues.weekendCountsAsOne,
			roundingRule: parsedValues.roundingRule,
			currency: parsedValues.currency.trim().toUpperCase(),
			locale: parsedValues.locale.trim(),
			insuranceEnabled: parsedValues.insuranceEnabled,
			insuranceRatePercent: parsedValues.insuranceRatePercent,
		},
		timezone: parsedValues.timezone.trim(),
		newArrivalsWindowDays: parsedValues.newArrivalsWindowDays,
		bookingMode: parsedValues.bookingMode,
		communication: {
			orderCommunicationMode: parsedValues.orderCommunicationMode,
			whatsAppNumber: parsedValues.whatsAppNumber.trim() || undefined,
			showFloatingWhatsAppButton: parsedValues.showFloatingWhatsAppButton,
		},
	};

	return UpdateTenantConfigBodySchema.parse(dto);
}
