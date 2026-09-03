import {
	type BranchDeliveryConfigurationDto,
	type PutBranchDeliveryConfigurationBodyDto,
	PutBranchDeliveryConfigurationBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

const requiredDecimalSchema = z
	.string()
	.trim()
	.min(1, "Este campo es obligatorio")
	.regex(/^\d+(?:\.\d+)?$/, "Introduce un importe válido");
const requiredTimeSchema = z
	.string()
	.regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Introduce una hora válida");
const positiveDistanceSchema = z
	.string()
	.trim()
	.min(1, "La distancia es obligatoria")
	.refine(
		(value) => parseKilometersToMeters(value) !== null,
		"Introduce una distancia positiva con hasta 3 decimales",
	);

export const deliveryConfigurationFormSchema = z
	.object({
		enabled: z.boolean(),
		currency: z
			.string()
			.trim()
			.regex(/^[A-Za-z]{3}$/, "Usa un código de moneda de 3 letras"),
		distancePriceBands: z
			.array(
				z.object({
					rowId: z.string(),
					maxDistanceKm: positiveDistanceSchema,
					price: requiredDecimalSchema,
				}),
			)
			.min(1, "Agrega al menos un tramo"),
		eligibleWeekdays: z
			.array(z.number().int().min(0).max(6))
			.min(1, "Selecciona al menos un día"),
		eligibilityStartTime: requiredTimeSchema,
		eligibilityEndTime: requiredTimeSchema,
		normalServiceStartTime: requiredTimeSchema,
		normalServiceEndTime: requiredTimeSchema,
		specialHoursSurcharge: requiredDecimalSchema,
		transportReservationMinutes: z
			.string()
			.trim()
			.min(1, "Este campo es obligatorio")
			.regex(/^\d+$/, "Introduce un número entero no negativo"),
	})
	.superRefine((values, context) => {
		if (
			new Set(values.eligibleWeekdays).size !== values.eligibleWeekdays.length
		) {
			context.addIssue({
				code: "custom",
				message: "Los días no pueden repetirse",
				path: ["eligibleWeekdays"],
			});
		}

		const distances = values.distancePriceBands
			.map((band) => parseKilometersToMeters(band.maxDistanceKm))
			.filter((distance): distance is number => distance !== null);
		if (new Set(distances).size !== distances.length) {
			context.addIssue({
				code: "custom",
				message: "Las distancias de los tramos deben ser únicas",
				path: ["distancePriceBands"],
			});
		}

		const eligibilityStart = timeToMinutes(values.eligibilityStartTime);
		const eligibilityEnd = timeToMinutes(values.eligibilityEndTime);
		const normalStart = timeToMinutes(values.normalServiceStartTime);
		const normalEnd = timeToMinutes(values.normalServiceEndTime);

		if (
			eligibilityStart !== null &&
			eligibilityEnd !== null &&
			eligibilityStart >= eligibilityEnd
		) {
			context.addIssue({
				code: "custom",
				message: "El horario habilitado debe comenzar antes de finalizar",
				path: ["eligibilityEndTime"],
			});
		}
		if (
			normalStart !== null &&
			normalEnd !== null &&
			normalStart >= normalEnd
		) {
			context.addIssue({
				code: "custom",
				message: "El horario normal debe comenzar antes de finalizar",
				path: ["normalServiceEndTime"],
			});
		}
		if (
			eligibilityStart !== null &&
			eligibilityEnd !== null &&
			normalStart !== null &&
			normalEnd !== null &&
			(normalStart < eligibilityStart || normalEnd > eligibilityEnd)
		) {
			context.addIssue({
				code: "custom",
				message: "El horario normal debe estar dentro del horario habilitado",
				path: ["normalServiceStartTime"],
			});
		}
	});

export type DeliveryConfigurationFormValues = z.infer<
	typeof deliveryConfigurationFormSchema
>;

export function createEmptyDistancePriceBand() {
	return { rowId: crypto.randomUUID(), maxDistanceKm: "", price: "" };
}

export function createDeliveryConfigurationFormDefaults(
	currency: string,
): DeliveryConfigurationFormValues {
	return {
		enabled: false,
		currency: currency.toUpperCase(),
		distancePriceBands: [createEmptyDistancePriceBand()],
		eligibleWeekdays: [],
		eligibilityStartTime: "",
		eligibilityEndTime: "",
		normalServiceStartTime: "",
		normalServiceEndTime: "",
		specialHoursSurcharge: "",
		transportReservationMinutes: "",
	};
}

export function toDeliveryConfigurationFormDefaults(
	configuration: BranchDeliveryConfigurationDto,
): DeliveryConfigurationFormValues {
	return {
		enabled: configuration.enabled,
		currency: configuration.currency,
		distancePriceBands: configuration.distancePriceBands.map((band) => ({
			rowId: crypto.randomUUID(),
			maxDistanceKm: metersToKm(band.maxDistanceMeters),
			price: band.price,
		})),
		eligibleWeekdays: [...configuration.eligibleWeekdays],
		eligibilityStartTime: minutesToTime(configuration.eligibilityStartMinute),
		eligibilityEndTime: minutesToTime(configuration.eligibilityEndMinute),
		normalServiceStartTime: minutesToTime(
			configuration.normalServiceStartMinute,
		),
		normalServiceEndTime: minutesToTime(configuration.normalServiceEndMinute),
		specialHoursSurcharge: configuration.specialHoursSurcharge,
		transportReservationMinutes: String(
			configuration.transportReservationMinutes,
		),
	};
}

export function toPutDeliveryConfigurationBodyDto(
	values: DeliveryConfigurationFormValues,
): PutBranchDeliveryConfigurationBodyDto {
	const parsed = deliveryConfigurationFormSchema.parse(values);
	const distancePriceBands = parsed.distancePriceBands
		.map((band) => ({
			maxDistanceMeters: kmToMeters(band.maxDistanceKm),
			price: band.price.trim(),
		}))
		.sort((left, right) => left.maxDistanceMeters - right.maxDistanceMeters);

	return PutBranchDeliveryConfigurationBodySchema.parse({
		enabled: parsed.enabled,
		currency: parsed.currency.trim().toUpperCase(),
		maximumDistanceMeters: distancePriceBands.at(-1)?.maxDistanceMeters,
		eligibleWeekdays: [...parsed.eligibleWeekdays].sort(
			(left, right) => left - right,
		),
		eligibilityStartMinute: requireMinutes(parsed.eligibilityStartTime),
		eligibilityEndMinute: requireMinutes(parsed.eligibilityEndTime),
		normalServiceStartMinute: requireMinutes(parsed.normalServiceStartTime),
		normalServiceEndMinute: requireMinutes(parsed.normalServiceEndTime),
		specialHoursSurcharge: parsed.specialHoursSurcharge.trim(),
		transportReservationMinutes: Number(parsed.transportReservationMinutes),
		distancePriceBands,
	});
}

export function minutesToTime(minutes: number): string {
	return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number | null {
	if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
	const [hours, minutes] = time.split(":").map(Number);
	return hours * 60 + minutes;
}

export function metersToKm(meters: number): string {
	return String(meters / 1000);
}

export function kmToMeters(kilometers: string): number {
	const meters = parseKilometersToMeters(kilometers);
	if (meters === null) throw new Error("Invalid kilometer value");
	return meters;
}

function parseKilometersToMeters(kilometers: string): number | null {
	const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(kilometers.trim());
	if (!match) return null;

	const wholeMeters = BigInt(match[1]) * 1000n;
	const fractionalMeters = BigInt((match[2] ?? "").padEnd(3, "0"));
	const meters = wholeMeters + fractionalMeters;
	if (meters <= 0n || meters > BigInt(Number.MAX_SAFE_INTEGER)) return null;

	return Number(meters);
}

function requireMinutes(time: string): number {
	const minutes = timeToMinutes(time);
	if (minutes === null) throw new Error("Invalid time value");
	return minutes;
}
