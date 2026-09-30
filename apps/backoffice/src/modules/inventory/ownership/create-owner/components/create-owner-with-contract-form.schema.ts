import {
	type CreateOwnerWithContractBodyDto,
	CreateOwnerWithContractBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

const CONTRACT_BASIS_VALUES = ["GROSS", "NET"] as const;
const PERCENT_SCALE = 10n ** 28n;
const SHARE_SCALE = 100n * PERCENT_SCALE;

function scaledPercent(value: number): bigint | null {
	if (!Number.isFinite(value)) return null;
	const decimal = value.toString();
	if (!/^\d+(?:\.\d+)?$/.test(decimal)) return null;

	const [whole, fraction = ""] = decimal.split(".");
	const significantFraction = fraction.replace(/0+$/, "");
	if (significantFraction.length > 28) return null;

	return (
		BigInt(whole) * PERCENT_SCALE +
		BigInt(significantFraction.padEnd(28, "0") || "0")
	);
}

export const createOwnerWithContractFormSchema = z
	.object({
		ownerName: z
			.string()
			.trim()
			.min(1, "El nombre del propietario es obligatorio"),
		basis: z.enum(CONTRACT_BASIS_VALUES),
		ownerSharePercent: z
			.number({ error: "La participación del propietario es obligatoria" })
			.min(0, "Mínimo 0%")
			.max(100, "Máximo 100%"),
		rentalSharePercent: z
			.number({ error: "La participación de alquiler es obligatoria" })
			.min(0, "Mínimo 0%")
			.max(100, "Máximo 100%"),
		validFrom: z.string().min(1, "La fecha de inicio es obligatoria"),
		validTo: z.string(),
	})
	.refine(
		(values) => {
			const owner = scaledPercent(values.ownerSharePercent);
			const rental = scaledPercent(values.rentalSharePercent);
			return (
				owner !== null && rental !== null && owner + rental === SHARE_SCALE
			);
		},
		{
			message: "La suma de participaciones debe ser igual al 100%",
			path: ["rentalSharePercent"],
		},
	)
	.refine(
		(values) =>
			!values.validTo ||
			new Date(`${values.validTo}T00:00:00.000Z`).getTime() >
				new Date(`${values.validFrom}T00:00:00.000Z`).getTime(),
		{
			message: "La fecha de fin debe ser posterior a la fecha de inicio",
			path: ["validTo"],
		},
	);

export type CreateOwnerWithContractFormValues = z.infer<
	typeof createOwnerWithContractFormSchema
>;

export function createOwnerWithContractFormDefaultValues(): CreateOwnerWithContractFormValues {
	return {
		ownerName: "",
		basis: "NET",
		ownerSharePercent: 70,
		rentalSharePercent: 30,
		validFrom: new Date().toISOString().slice(0, 10),
		validTo: "",
	};
}

function dateInputToUtcIso(value: string): string {
	return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function percentToShare(value: number): string {
	const scaled = scaledPercent(value);
	if (scaled === null) throw new Error("Invalid share percentage.");
	const whole = scaled / SHARE_SCALE;
	const fraction = (scaled % SHARE_SCALE)
		.toString()
		.padStart(30, "0")
		.replace(/0+$/, "");
	return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function toCreateOwnerWithContractDto(
	values: CreateOwnerWithContractFormValues,
): CreateOwnerWithContractBodyDto {
	const parsedValues = createOwnerWithContractFormSchema.parse(values);

	const dto = {
		owner: {
			name: parsedValues.ownerName.trim(),
		},
		contract: {
			basis: parsedValues.basis,
			ownerShare: percentToShare(parsedValues.ownerSharePercent),
			rentalShare: percentToShare(parsedValues.rentalSharePercent),
			validFrom: dateInputToUtcIso(parsedValues.validFrom),
			validTo: parsedValues.validTo
				? dateInputToUtcIso(parsedValues.validTo)
				: null,
		},
	};

	CreateOwnerWithContractBodySchema.parse(dto);

	return dto;
}
