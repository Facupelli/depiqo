import {
	type CalculateDraftRentalPriceBodyDto,
	CalculateDraftRentalPriceBodySchema,
	PayableTargetTotalSchema,
	type PreviewDraftRentalCostBodyDto,
	PreviewDraftRentalCostBodySchema,
	type UpdateDraftRentalBodyDto,
	UpdateDraftRentalDeliveryDecisionsSchema,
} from "@repo/api-contracts";
import { z } from "zod";
import {
	isRentalPeriodChronological,
	resolveRentalPeriod,
	resolveRentalPeriodEndpoint as resolveSharedRentalPeriodEndpoint,
} from "@/modules/rentals/shared/rental-period/rental-period";

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

const draftRentalDerivationBaseSchema = z.object({
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
	targetTotal: z.union([z.literal(""), PayableTargetTotalSchema], {
		error: "Ingresá un total de equipos positivo y con hasta dos decimales.",
	}),
	deliveryAgreementDecision: z.enum(["", "SET", "CLEAR", "KEEP"]),
	deliveryAgreementAmount: z.string(),
	deliveryExceptionAccepted: z.boolean(),
	transportReservationMinutes: z.string(),
});

const draftRentalReasonFields = {
	adjustmentReason: z.string(),
	deliveryAgreementReason: z.string(),
	deliveryExceptionReason: z.string(),
};
const draftRentalComposerFormBaseSchema =
	draftRentalDerivationBaseSchema.extend(draftRentalReasonFields);

export type DraftRentalComposerFormValues = z.infer<
	typeof draftRentalComposerFormBaseSchema
>;
export type DraftRentalDerivationValues = Pick<
	DraftRentalComposerFormValues,
	| "branchId"
	| "rentalCustomerId"
	| "periodStartDate"
	| "periodStartTime"
	| "periodEndDate"
	| "periodEndTime"
	| "selectedOffers"
	| "fulfillmentMethod"
	| "deliveryDestination"
	| "insuranceSelected"
	| "targetTotal"
	| "deliveryAgreementDecision"
	| "deliveryAgreementAmount"
	| "deliveryExceptionAccepted"
	| "transportReservationMinutes"
>;

export type DraftRentalSelectedOfferFormValues = z.infer<
	typeof draftRentalSelectedOfferFormSchema
>;

export type DraftRentalComposerValidationContext = {
	selectableBranchIds: ReadonlySet<string>;
	resolveBranchTimezone: (branchId: string) => string;
};

export function createDraftRentalComposerFormSchema(
	context: DraftRentalComposerValidationContext,
) {
	return createDraftRentalDerivationSchema(context).safeExtend(
		draftRentalReasonFields,
	);
}

export function createDraftRentalDerivationSchema({
	selectableBranchIds,
	resolveBranchTimezone,
}: DraftRentalComposerValidationContext) {
	return draftRentalDerivationBaseSchema.superRefine((value, ctx) => {
		if (value.fulfillmentMethod === "DELIVERY") {
			if (
				value.deliveryAgreementDecision === "SET" &&
				!UpdateDraftRentalDeliveryDecisionsSchema.shape.pricingAgreement.safeParse(
					{
						type: "SET",
						amount: normalizeAgreementAmount(value.deliveryAgreementAmount),
					},
				).success
			) {
				ctx.addIssue({
					code: "custom",
					path: ["deliveryAgreementAmount"],
					message: "Ingresá un importe no negativo, con hasta dos decimales.",
				});
			}
			const minutes = value.transportReservationMinutes.trim();
			if (
				minutes &&
				(!/^\d+$/.test(minutes) || !Number.isSafeInteger(Number(minutes)))
			) {
				ctx.addIssue({
					code: "custom",
					path: ["transportReservationMinutes"],
					message: "Los minutos de transporte deben ser un entero no negativo.",
				});
			}
		}
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

			if (start && end && !isRentalPeriodChronological({ start, end })) {
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
	const resolution = resolveSharedRentalPeriodEndpoint(
		date,
		minuteOfDay,
		timezone,
	);
	if (resolution.kind === "resolved") return resolution.instant;

	ctx.addIssue({
		code: "custom",
		path: [field],
		message: "El horario seleccionado no existe en esta sucursal",
	});
	return null;
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
		deliveryAgreementDecision: "",
		deliveryAgreementAmount: "",
		deliveryAgreementReason: "",
		deliveryExceptionAccepted: false,
		deliveryExceptionReason: "",
		transportReservationMinutes: "",
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

export function emptyDraftRentalValueToUndefined(
	value: string,
): string | undefined {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export function buildDraftRentalPeriod(
	values: DraftRentalDerivationValues,
	timezone: string,
) {
	const resolution = resolveRentalPeriod(
		{
			startDate: values.periodStartDate,
			startTime: values.periodStartTime,
			endDate: values.periodEndDate,
			endTime: values.periodEndTime,
		},
		timezone,
	);
	if (resolution.kind === "nonexistent") {
		throw new RangeError(
			"The selected local time does not exist in the branch timezone.",
		);
	}

	return {
		start: resolution.period.start.toISOString(),
		end: resolution.period.end.toISOString(),
	};
}

export function toDraftRentalSelectedOffers(
	values: DraftRentalDerivationValues,
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
	values: DraftRentalDerivationValues,
	timezone: string,
): CalculateDraftRentalPriceBodyDto {
	const targetTotal = emptyDraftRentalValueToUndefined(values.targetTotal);
	const dto = {
		branchId: values.branchId,
		rentalCustomerId: emptyDraftRentalValueToUndefined(values.rentalCustomerId),
		period: buildDraftRentalPeriod(values, timezone),
		selectedOffers: toDraftRentalSelectedOffers(values),
		targetTotalAdjustment: targetTotal
			? {
					mode: "TARGET_TOTAL" as const,
					targetTotal,
				}
			: undefined,
	};

	return CalculateDraftRentalPriceBodySchema.parse(dto);
}

function normalizeAgreementAmount(value: string) {
	return value.trim().replace(",", ".");
}

export function toDraftRentalDeliveryDecisions(
	values: DraftRentalComposerFormValues,
): UpdateDraftRentalBodyDto["deliveryDecisions"] {
	if (values.fulfillmentMethod !== "DELIVERY") return undefined;
	const type = values.deliveryAgreementDecision;
	const minutes = values.transportReservationMinutes.trim();
	return {
		pricingAgreement:
			type === "SET"
				? {
						type,
						amount: normalizeAgreementAmount(values.deliveryAgreementAmount),
						reason: emptyDraftRentalValueToUndefined(
							values.deliveryAgreementReason,
						),
					}
				: type
					? { type }
					: undefined,
		policyException: values.deliveryExceptionAccepted
			? {
					type: "AUTHORIZE",
					reason: emptyDraftRentalValueToUndefined(
						values.deliveryExceptionReason,
					),
				}
			: undefined,
		transportReservationMinutes: minutes ? Number(minutes) : undefined,
	};
}

export function toPreviewDraftRentalCostDto(
	values: DraftRentalDerivationValues,
	timezone: string,
	rentalId?: string,
): PreviewDraftRentalCostBodyDto {
	const type = values.deliveryAgreementDecision;
	const minutes = values.transportReservationMinutes.trim();
	const destination = values.deliveryDestination;
	const dto: PreviewDraftRentalCostBodyDto = {
		...toCalculateDraftRentalPriceDto(values, timezone),
		rentalId,
		insuranceSelected: values.insuranceSelected,
		fulfillmentMethod: values.fulfillmentMethod,
		deliveryIntent:
			values.fulfillmentMethod !== "DELIVERY"
				? undefined
				: destination.status === "NEW_DESTINATION"
					? {
							type: "NEW_DESTINATION",
							address: destination.address,
							locationId: destination.locationId,
						}
					: destination.status === "EXISTING"
						? { type: "KEEP_CURRENT" }
						: undefined,
		deliveryDecisions:
			values.fulfillmentMethod === "DELIVERY"
				? {
						pricingAgreement:
							type === "SET"
								? {
										type,
										amount: normalizeAgreementAmount(
											values.deliveryAgreementAmount,
										),
									}
								: type
									? { type }
									: undefined,
						transportReservationMinutes: minutes ? Number(minutes) : undefined,
					}
				: undefined,
	};
	return PreviewDraftRentalCostBodySchema.parse(dto);
}
