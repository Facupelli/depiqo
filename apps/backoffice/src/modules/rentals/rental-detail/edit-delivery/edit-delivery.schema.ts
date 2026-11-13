import {
	type ChangeConfirmedRentalDeliveryBodyDto,
	ChangeConfirmedRentalDeliveryBodySchema,
	DeliveryAgreementAmountSchema,
	type GetRentalDetailResponseDto,
} from "@repo/api-contracts";
import { z } from "zod";
import {
	decimalsEqual,
	parsePlainDecimal,
} from "@/shared/utils/decimal-string";

export type DeliveryRental = Pick<
	GetRentalDetailResponseDto,
	"version" | "acceptedDelivery" | "fulfillment"
>;

export function deliveryAmountsEqual(left: string, right: string) {
	const a = parsePlainDecimal(left);
	const b = parsePlainDecimal(right);
	return a !== null && b !== null && decimalsEqual(a, b);
}

export function deliveryDefaults(
	rental: DeliveryRental,
	arrangement = rental.acceptedDelivery?.arrangement ?? "ROUTED",
) {
	const delivery = rental.acceptedDelivery;
	const transition = arrangement !== delivery?.arrangement;
	return {
		arrangement,
		changeAddress: transition,
		address: transition
			? ""
			: (rental.fulfillment.deliveryDetails?.address ?? ""),
		locationId: "",
		pricing: transition ? "" : "KEEP",
		amount: transition ? "" : (delivery?.staffAgreement?.amount ?? ""),
		reason: transition ? "" : (delivery?.staffAgreement?.reason ?? ""),
		changeMinutes: transition && arrangement === "STAFF_ARRANGED",
		minutes: transition
			? ""
			: String(delivery?.transportReservationMinutes ?? ""),
		authorizeException: false,
		exceptionReason: "",
	};
}

export type DeliveryFormValues = ReturnType<typeof deliveryDefaults>;

function deliveryEditIntent(value: DeliveryFormValues, rental: DeliveryRental) {
	const transition = value.arrangement !== rental.acceptedDelivery?.arrangement;
	// Hydration, or opting into editing without changing a free-text address,
	// must not discard the persisted destination's optional geocoding.
	const destinationChanged =
		transition ||
		(value.changeAddress &&
			(value.arrangement === "ROUTED" ||
				value.address.trim() !==
					rental.fulfillment.deliveryDetails?.address.trim()));
	const minutesChanged =
		(value.changeMinutes ||
			(transition && value.arrangement === "STAFF_ARRANGED")) &&
		(transition ||
			Number(value.minutes) !==
				rental.acceptedDelivery?.transportReservationMinutes);
	return {
		transition,
		destinationChanged,
		minutesChanged,
		reevaluate:
			value.arrangement === "ROUTED" &&
			(destinationChanged || minutesChanged || value.authorizeException),
	};
}

export function canRequestAutomaticDeliveryPrice(
	value: DeliveryFormValues,
	rental: DeliveryRental,
) {
	return (
		value.arrangement === "ROUTED" &&
		((rental.acceptedDelivery?.arrangement === "ROUTED" &&
			rental.acceptedDelivery.deliveryTotal !== undefined) ||
			deliveryEditIntent(value, rental).reevaluate)
	);
}

export function createDeliveryFormSchema(rental: DeliveryRental) {
	return z
		.object({
			arrangement: z.enum(["ROUTED", "STAFF_ARRANGED"]),
			changeAddress: z.boolean(),
			address: z.string(),
			locationId: z.string(),
			pricing: z.string(),
			amount: z.string(),
			reason: z.string(),
			changeMinutes: z.boolean(),
			minutes: z.string(),
			authorizeException: z.boolean(),
			exceptionReason: z.string(),
		})
		.superRefine((value, context) => {
			const issue = (path: keyof DeliveryFormValues, message: string) =>
				context.addIssue({ code: "custom", path: [path], message });
			const transition =
				value.arrangement !== rental.acceptedDelivery?.arrangement;
			if (transition || value.changeAddress) {
				if (!value.address.trim())
					issue("address", "Ingresá una dirección de entrega.");
				if (value.arrangement === "ROUTED" && !value.locationId.trim())
					issue("address", "Seleccioná una dirección de las sugerencias.");
			}
			if (!["KEEP", "SET", "CLEAR"].includes(value.pricing))
				issue("pricing", "Elegí cómo aplicar el precio de entrega y retiro.");
			if (transition && value.pricing === "KEEP")
				issue(
					"pricing",
					"El cambio de modalidad requiere una nueva decisión de precio.",
				);
			if (
				value.arrangement === "STAFF_ARRANGED" &&
				(value.pricing === "CLEAR" || (transition && value.pricing !== "SET"))
			)
				issue(
					"pricing",
					"La entrega coordinada requiere un nuevo importe acordado.",
				);
			if (
				value.pricing === "CLEAR" &&
				value.arrangement === "ROUTED" &&
				!canRequestAutomaticDeliveryPrice(value, rental)
			)
				issue(
					"pricing",
					"No hay un precio automático guardado. Conservá o editá el acuerdo actual.",
				);
			if (
				value.pricing === "SET" &&
				!DeliveryAgreementAmountSchema.safeParse(value.amount).success
			)
				issue(
					"amount",
					"Ingresá un importe mayor o igual a cero con precisión de centavos.",
				);
			if (
				value.changeMinutes ||
				(transition && value.arrangement === "STAFF_ARRANGED")
			) {
				if (
					!/^\d+$/.test(value.minutes.trim()) ||
					!Number.isSafeInteger(Number(value.minutes))
				)
					issue("minutes", "Ingresá minutos enteros mayores o iguales a cero.");
			}
		});
}

export function deliveryChanges(
	value: DeliveryFormValues,
	rental: DeliveryRental,
): ChangeConfirmedRentalDeliveryBodyDto | null {
	const previous = rental.acceptedDelivery;
	if (!previous) return null;
	const { transition, destinationChanged, minutesChanged, reevaluate } =
		deliveryEditIntent(value, rental);
	const decisions: NonNullable<
		ChangeConfirmedRentalDeliveryBodyDto["deliveryDecisions"]
	> = {};
	if (minutesChanged)
		decisions.transportReservationMinutes = Number(value.minutes);
	if (
		value.pricing === "SET" &&
		(transition ||
			!previous.staffAgreement ||
			!deliveryAmountsEqual(value.amount, previous.staffAgreement.amount) ||
			value.reason.trim() !== (previous.staffAgreement.reason?.trim() ?? "") ||
			reevaluate)
	) {
		decisions.pricingAgreement = {
			type: "SET",
			amount: value.amount.trim(),
			...(value.reason.trim() ? { reason: value.reason.trim() } : {}),
		};
	} else if (
		value.pricing === "CLEAR" &&
		(transition || previous.staffAgreement)
	) {
		decisions.pricingAgreement = { type: "CLEAR" };
	} else if (
		value.pricing === "KEEP" &&
		previous.staffAgreement &&
		reevaluate
	) {
		decisions.pricingAgreement = { type: "KEEP" };
	}
	if (value.arrangement === "ROUTED" && value.authorizeException)
		decisions.policyException = {
			type: "AUTHORIZE",
			...(value.exceptionReason.trim()
				? { reason: value.exceptionReason.trim() }
				: {}),
		};
	if (!destinationChanged && Object.keys(decisions).length === 0) return null;
	return ChangeConfirmedRentalDeliveryBodySchema.parse({
		expectedVersion: rental.version,
		...(destinationChanged
			? {
					destination:
						value.arrangement === "ROUTED"
							? {
									arrangement: "ROUTED",
									address: value.address.trim(),
									locationId: value.locationId,
								}
							: {
									arrangement: "STAFF_ARRANGED",
									address: value.address.trim(),
								},
				}
			: {}),
		...(Object.keys(decisions).length ? { deliveryDecisions: decisions } : {}),
	});
}
