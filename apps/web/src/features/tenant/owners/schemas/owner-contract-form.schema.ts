import {
	type CreateOwnerContractDto,
	createOwnerContractSchema,
} from "@repo/schemas";
import { ContractBasis } from "@repo/types";
import { z } from "zod";
import dayjs from "@/lib/dates/dayjs";

// -----------------------------------------------------
// Form Schema
// -----------------------------------------------------

export const ownerContractFormSchema = z
	.object({
		ownerShare: z.number().min(0, "Mínimo 0").max(1, "Máximo 1"),
		rentalShare: z.number().min(0, "Mínimo 0").max(1, "Máximo 1"),
		basis: z.enum(ContractBasis),
		validFrom: z.string().min(1, "La fecha de inicio es obligatoria"),
		validUntil: z.string().or(z.literal("")),
		notes: z.string().or(z.literal("")),
		isActive: z.boolean(),
	})
	.refine((v) => Math.abs(v.ownerShare + v.rentalShare - 1) < 1e-10, {
		message: "La suma de participaciones debe ser igual a 1.00",
		path: ["rentalShare"],
	});

export type OwnerContractFormValues = z.infer<typeof ownerContractFormSchema>;

// -----------------------------------------------------
// Default values
// -----------------------------------------------------

export function getOwnerContractFormDefaults(): OwnerContractFormValues {
	return {
		ownerShare: 0.7,
		rentalShare: 0.3,
		basis: ContractBasis.NET_COLLECTED,
		validFrom: dayjs().format("YYYY-MM-DD"),
		validUntil: "",
		notes: "",
		isActive: true,
	};
}

// -----------------------------------------------------
// DTO transformer
// -----------------------------------------------------

export function toCreateOwnerContractDto(
	values: OwnerContractFormValues,
	ownerId: string,
): CreateOwnerContractDto {
	const dto = {
		ownerId: ownerId,
		ownerShare: values.ownerShare,
		rentalShare: values.rentalShare,
		basis: values.basis,
		validFrom: new Date(values.validFrom),
		validUntil: values.validUntil ? new Date(values.validUntil) : undefined,
		notes: values.notes || undefined,
		isActive: values.isActive,
	};

	return createOwnerContractSchema.parse(dto);
}
