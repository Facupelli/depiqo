import {
	type ContractSignerBodyDto,
	ContractSignerBodySchema,
	type ContractSignerDto,
} from "@repo/api-contracts";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

const signatureFileSchema = z.custom<File | null>(
	(value) =>
		value === null ||
		value === undefined ||
		(typeof File !== "undefined" && value instanceof File),
);

export const contractSignerFormSchema = z.object({
	fullName: z.string().trim().min(1, "El nombre completo es obligatorio."),
	documentNumber: z
		.string()
		.trim()
		.min(1, "El numero de documento es obligatorio."),
	phone: z.string().trim(),
	address: z.string().trim(),
	signatureUrl: z.string().trim(),
	signatureFile: signatureFileSchema,
});

export type ContractSignerFormValues = z.infer<typeof contractSignerFormSchema>;

export function createContractSignerFormDefaultValues(): ContractSignerFormValues {
	return {
		fullName: "",
		documentNumber: "",
		phone: "",
		address: "",
		signatureUrl: "",
		signatureFile: null,
	};
}

export function contractSignerToFormValues(
	contractSigner?: ContractSignerDto | null,
): ContractSignerFormValues {
	return {
		fullName: contractSigner?.fullName ?? "",
		documentNumber: contractSigner?.documentNumber ?? "",
		phone: contractSigner?.phone ?? "",
		address: contractSigner?.address ?? "",
		signatureUrl: contractSigner?.signatureUrl ?? "",
		signatureFile: null,
	};
}

export function toContractSignerBodyDto(
	values: ContractSignerFormValues,
): ContractSignerBodyDto {
	return ContractSignerBodySchema.parse({
		fullName: values.fullName.trim(),
		documentNumber: values.documentNumber.trim(),
		phone: emptyToNull(values.phone),
		address: emptyToNull(values.address),
		signatureUrl: emptyToNull(values.signatureUrl),
	});
}
