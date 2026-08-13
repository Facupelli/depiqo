import {
	type CalculateDraftRentalPriceBodyDto,
	CalculateDraftRentalPriceBodySchema,
	type CreateDraftRentalBodyDto,
	CreateDraftRentalBodySchema,
} from "@repo/api-contracts";
import { resolveLocalDateTime } from "@repo/temporal";
import { z } from "zod";

function toRentalPeriodDateTime(
	date: string,
	minuteOfDay: number,
	timezone: string,
): Date {
	const resolution = resolveLocalDateTime({
		localDate: date,
		minuteOfDay,
		timeZone: timezone,
	});

	if (resolution.kind === "nonexistent") {
		throw new RangeError(
			"The selected local time does not exist in the branch timezone.",
		);
	}

	return resolution.instant;
}

export const draftRentalSelectedOfferFormSchema = z.object({
	rentalOfferId: z.string().min(1),
	name: z.string().min(1),
	quantity: z.number().int().positive(),
	availableCount: z.number().int().nonnegative().nullable(),
});

export const draftRentalComposerFormSchema = z
	.object({
		branchId: z.string().min(1, "Seleccioná una sucursal"),
		rentalCustomerId: z.string(),
		periodStartDate: z.string().min(1, "La fecha de inicio es obligatoria"),
		periodStartTime: z.number().int().nonnegative(),
		periodEndDate: z.string().min(1, "La fecha de devolución es obligatoria"),
		periodEndTime: z.number().int().nonnegative(),
		selectedOffers: z
			.array(draftRentalSelectedOfferFormSchema)
			.min(1, "Agregá al menos un producto"),
		fulfillmentMethod: z.enum(["PICKUP", "DELIVERY"]),
		deliveryDetails: z.object({
			addressLine1: z.string(),
			addressLine2: z.string(),
			city: z.string(),
			state: z.string(),
			postalCode: z.string(),
			country: z.string(),
			contactName: z.string(),
			contactPhone: z.string(),
			notes: z.string(),
		}),
		insuranceSelected: z.boolean(),
		targetTotal: z.string(),
		adjustmentReason: z.string(),
	})
	.superRefine((value, ctx) => {
		const start = toRentalPeriodDateTime(
			value.periodStartDate,
			value.periodStartTime,
			"UTC",
		);
		const end = toRentalPeriodDateTime(
			value.periodEndDate,
			value.periodEndTime,
			"UTC",
		);

		if (end <= start) {
			ctx.addIssue({
				code: "custom",
				path: ["periodEndDate"],
				message: "La devolución debe ser posterior al inicio",
			});
		}

		if (value.fulfillmentMethod === "DELIVERY") {
			if (!value.deliveryDetails.addressLine1.trim()) {
				ctx.addIssue({
					code: "custom",
					path: ["deliveryDetails", "addressLine1"],
					message: "La dirección es obligatoria",
				});
			}

			if (!value.deliveryDetails.city.trim()) {
				ctx.addIssue({
					code: "custom",
					path: ["deliveryDetails", "city"],
					message: "La ciudad es obligatoria",
				});
			}
		}
	});

export type DraftRentalSelectedOfferFormValues = z.infer<
	typeof draftRentalSelectedOfferFormSchema
>;
export type DraftRentalComposerFormValues = z.infer<
	typeof draftRentalComposerFormSchema
>;

export function createDraftRentalComposerDefaultValues(
	branchId = "",
): DraftRentalComposerFormValues {
	return {
		branchId,
		rentalCustomerId: "",
		periodStartDate: "",
		periodStartTime: 9 * 60,
		periodEndDate: "",
		periodEndTime: 18 * 60,
		selectedOffers: [],
		fulfillmentMethod: "PICKUP",
		deliveryDetails: {
			addressLine1: "",
			addressLine2: "",
			city: "",
			state: "",
			postalCode: "",
			country: "",
			contactName: "",
			contactPhone: "",
			notes: "",
		},
		insuranceSelected: false,
		targetTotal: "",
		adjustmentReason: "",
	};
}

export function createDraftRentalSelectedOffer(
	input: DraftRentalSelectedOfferFormValues,
): DraftRentalSelectedOfferFormValues {
	return {
		...input,
		quantity:
			input.availableCount === null
				? input.quantity
				: Math.min(input.quantity, input.availableCount),
	};
}

function emptyToUndefined(value: string): string | undefined {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export function buildDraftRentalPeriod(
	values: DraftRentalComposerFormValues,
	timezone: string,
) {
	return {
		start: toRentalPeriodDateTime(
			values.periodStartDate,
			values.periodStartTime,
			timezone,
		).toISOString(),
		end: toRentalPeriodDateTime(
			values.periodEndDate,
			values.periodEndTime,
			timezone,
		).toISOString(),
	};
}

function selectedOffers(values: DraftRentalComposerFormValues) {
	return values.selectedOffers.map((offer) => ({
		rentalOfferId: offer.rentalOfferId,
		quantity: offer.quantity,
	}));
}

function manualPricingAdjustment(values: DraftRentalComposerFormValues) {
	const targetTotal = emptyToUndefined(values.targetTotal);

	if (!targetTotal) {
		return undefined;
	}

	return {
		mode: "TARGET_TOTAL" as const,
		targetTotal,
		reason: emptyToUndefined(values.adjustmentReason),
	};
}

export function toCalculateDraftRentalPriceDto(
	values: DraftRentalComposerFormValues,
	timezone: string,
): CalculateDraftRentalPriceBodyDto {
	const adjustment = manualPricingAdjustment(values);
	const dto = {
		branchId: values.branchId,
		rentalCustomerId: emptyToUndefined(values.rentalCustomerId),
		period: buildDraftRentalPeriod(values, timezone),
		selectedOffers: selectedOffers(values),
		targetTotalAdjustment: adjustment
			? {
					mode: "TARGET_TOTAL" as const,
					targetTotal: adjustment.targetTotal,
				}
			: undefined,
	};

	CalculateDraftRentalPriceBodySchema.parse(dto);

	return dto;
}

export function toCreateDraftRentalDto(
	values: DraftRentalComposerFormValues,
	timezone: string,
): CreateDraftRentalBodyDto {
	const deliveryDetails = values.deliveryDetails;
	const dto = {
		branchId: values.branchId,
		rentalCustomerId: emptyToUndefined(values.rentalCustomerId),
		period: buildDraftRentalPeriod(values, timezone),
		selectedOffers: selectedOffers(values),
		fulfillmentMethod: values.fulfillmentMethod,
		deliveryDetails:
			values.fulfillmentMethod === "DELIVERY"
				? {
						addressLine1: deliveryDetails.addressLine1,
						city: deliveryDetails.city,
						addressLine2: emptyToUndefined(deliveryDetails.addressLine2),
						state: emptyToUndefined(deliveryDetails.state),
						postalCode: emptyToUndefined(deliveryDetails.postalCode),
						country: emptyToUndefined(deliveryDetails.country),
						contactName: emptyToUndefined(deliveryDetails.contactName),
						contactPhone: emptyToUndefined(deliveryDetails.contactPhone),
						notes: emptyToUndefined(deliveryDetails.notes),
					}
				: undefined,
		insuranceSelected: values.insuranceSelected,
		manualPricingAdjustment: manualPricingAdjustment(values),
	};

	CreateDraftRentalBodySchema.parse(dto);

	return dto;
}
