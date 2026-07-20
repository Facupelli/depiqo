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

export const tenantContractSignerFormSchema = z.object({
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

export type TenantContractSignerFormValues = z.infer<
	typeof tenantContractSignerFormSchema
>;

export function createTenantContractSignerFormDefaultValues(): TenantContractSignerFormValues {
	return {
		fullName: "",
		documentNumber: "",
		phone: "",
		address: "",
		signatureUrl: "",
		signatureFile: null,
	};
}

export function tenantContractSignerToFormValues(
	contractSigner?: ContractSignerDto | null,
): TenantContractSignerFormValues {
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
	values: TenantContractSignerFormValues,
): ContractSignerBodyDto {
	return ContractSignerBodySchema.parse({
		fullName: values.fullName.trim(),
		documentNumber: values.documentNumber.trim(),
		phone: emptyToNull(values.phone),
		address: emptyToNull(values.address),
		signatureUrl: emptyToNull(values.signatureUrl),
	});
}
