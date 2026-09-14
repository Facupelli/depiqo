import {
	type CalculateDraftRentalPriceBodyDto,
	CalculateDraftRentalPriceBodySchema,
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

export const draftRentalDeliveryDestinationFormSchema = z.discriminatedUnion(
	"status",
	[
		z.object({
			status: z.literal("INVALID"),
			address: z.string(),
		}),
		z.object({
			status: z.literal("EXISTING"),
			address: z.string().trim().min(1),
		}),
		z.object({
			status: z.literal("NEW_DESTINATION"),
			address: z.string().trim().min(1),
			locationId: z.string().trim().min(1),
		}),
	],
);

const draftRentalComposerFormBaseSchema = z.object({
	branchId: z.string().min(1, "Seleccioná una sucursal"),
	rentalCustomerId: z.string(),
	periodStartDate: z.string().min(1, "La fecha de inicio es obligatoria"),
	periodStartTime: z
		.number()
		.int()
		.min(0)
		.max(24 * 60 - 1),
	periodEndDate: z.string().min(1, "La fecha de devolución es obligatoria"),
	periodEndTime: z
		.number()
		.int()
		.min(0)
		.max(24 * 60 - 1),
	selectedOffers: z
		.array(draftRentalSelectedOfferFormSchema)
		.min(1, "Añadí al menos un producto"),
	fulfillmentMethod: z.enum(["PICKUP", "DELIVERY"]),
	deliveryDestination: draftRentalDeliveryDestinationFormSchema,
	insuranceSelected: z.boolean(),
	targetTotal: z.string(),
	adjustmentReason: z.string(),
});

export type DraftRentalComposerFormValues = z.infer<
	typeof draftRentalComposerFormBaseSchema
>;
export type DraftRentalSelectedOfferFormValues = z.infer<
	typeof draftRentalSelectedOfferFormSchema
>;

export type DraftRentalComposerValidationContext = {
	selectableBranchIds: ReadonlySet<string>;
	resolveBranchTimezone: (branchId: string) => string;
};

export function createDraftRentalComposerFormSchema({
	selectableBranchIds,
	resolveBranchTimezone,
}: DraftRentalComposerValidationContext) {
	return draftRentalComposerFormBaseSchema.superRefine((value, ctx) => {
		if (value.branchId && !selectableBranchIds.has(value.branchId)) {
			ctx.addIssue({
				code: "custom",
				path: ["branchId"],
				message: "Seleccioná una sucursal disponible",
			});
		}

		if (value.periodStartDate && value.periodEndDate) {
			const timezone = resolveBranchTimezone(value.branchId);
			const start = resolveRentalPeriodEndpoint(
				value.periodStartDate,
				value.periodStartTime,
				timezone,
				"periodStartTime",
				ctx,
			);
			const end = resolveRentalPeriodEndpoint(
				value.periodEndDate,
				value.periodEndTime,
				timezone,
				"periodEndTime",
				ctx,
			);

			if (start && end && end <= start) {
				ctx.addIssue({
					code: "custom",
					path: ["periodEndDate"],
					message: "La devolución debe ser posterior al inicio",
				});
			}
		}

		if (
			value.fulfillmentMethod === "DELIVERY" &&
			value.deliveryDestination.status === "INVALID"
		) {
			ctx.addIssue({
				code: "custom",
				path: ["deliveryDestination", "address"],
				message: value.deliveryDestination.address.trim()
					? "Seleccioná una dirección de la lista"
					: "La dirección es obligatoria",
			});
		}
	});
}

function resolveRentalPeriodEndpoint(
	date: string,
	minuteOfDay: number,
	timezone: string,
	field: "periodStartTime" | "periodEndTime",
	ctx: z.RefinementCtx,
): Date | null {
	try {
		return toRentalPeriodDateTime(date, minuteOfDay, timezone);
	} catch (error) {
		if (!(error instanceof RangeError)) throw error;

		ctx.addIssue({
			code: "custom",
			path: [field],
			message: "El horario seleccionado no existe en esta sucursal",
		});
		return null;
	}
}

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
		deliveryDestination: {
			status: "INVALID",
			address: "",
		},
		insuranceSelected: false,
		targetTotal: "",
		adjustmentReason: "",
	};
}

export function draftRentalMinuteOfDayToTime(value: number): string {
	const hour = Math.floor(value / 60);
	const minute = value % 60;
	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function draftRentalTimeToMinuteOfDay(value: string): number | null {
	const match = /^(\d{2}):(\d{2})$/.exec(value);
	if (!match) return null;

	const hour = Number(match[1]);
	const minute = Number(match[2]);
	if (hour > 23 || minute > 59) return null;

	return hour * 60 + minute;
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

export function emptyDraftRentalValueToUndefined(
	value: string,
): string | undefined {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function resolveDraftRentalPeriod(
	values: DraftRentalComposerFormValues,
	timezone: string,
) {
	return {
		start: toRentalPeriodDateTime(
			values.periodStartDate,
			values.periodStartTime,
			timezone,
		),
		end: toRentalPeriodDateTime(
			values.periodEndDate,
			values.periodEndTime,
			timezone,
		),
	};
}

export function buildDraftRentalPeriod(
	values: DraftRentalComposerFormValues,
	timezone: string,
) {
	const period = resolveDraftRentalPeriod(values, timezone);
	return {
		start: period.start.toISOString(),
		end: period.end.toISOString(),
	};
}

export function toDraftRentalSelectedOffers(
	values: DraftRentalComposerFormValues,
) {
	return values.selectedOffers.map((offer) => ({
		rentalOfferId: offer.rentalOfferId,
		quantity: offer.quantity,
	}));
}

export function toDraftRentalManualPricingAdjustment(
	values: DraftRentalComposerFormValues,
) {
	const targetTotal = emptyDraftRentalValueToUndefined(values.targetTotal);

	if (!targetTotal) return undefined;

	return {
		mode: "TARGET_TOTAL" as const,
		targetTotal,
		reason: emptyDraftRentalValueToUndefined(values.adjustmentReason),
	};
}

export function toCalculateDraftRentalPriceDto(
	values: DraftRentalComposerFormValues,
	timezone: string,
): CalculateDraftRentalPriceBodyDto {
	const adjustment = toDraftRentalManualPricingAdjustment(values);
	const dto = {
		branchId: values.branchId,
		rentalCustomerId: emptyDraftRentalValueToUndefined(values.rentalCustomerId),
		period: buildDraftRentalPeriod(values, timezone),
		selectedOffers: toDraftRentalSelectedOffers(values),
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
