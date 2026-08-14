import {
	type CreateOwnerWithContractBodyDto,
	CreateOwnerWithContractBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

const CONTRACT_BASIS_VALUES = ["GROSS", "NET"] as const;

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
		(values) =>
			Math.abs(values.ownerSharePercent + values.rentalSharePercent - 100) <
			1e-10,
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
	return (value / 100).toString();
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
