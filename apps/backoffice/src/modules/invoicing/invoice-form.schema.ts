import {
	InvoiceAmountSchema,
	InvoiceExternalUrlSchema,
	InvoiceReferenceSchema,
	InvoiceSourceSystemSchema,
	LocalDateSchema,
	type RegisterExternalInvoiceBodyDto,
	RegisterExternalInvoiceBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

function normalizeInvoiceAmountInput(value: string): string {
	return value.trim().replace(",", ".");
}

export const invoiceFormSchema = z.object({
	reference: z.string().refine(
		(value) => InvoiceReferenceSchema.safeParse(value).success,
		"Ingresá una referencia de hasta 255 caracteres.",
	),
	issuedOn: z.string().refine(
		(value) => LocalDateSchema.safeParse(value).success,
		"Ingresá una fecha de emisión válida.",
	),
	amount: z.string().refine(
		(value) =>
			InvoiceAmountSchema.safeParse(normalizeInvoiceAmountInput(value)).success,
		"Ingresá un importe mayor a cero, con hasta 15 dígitos enteros y 4 decimales, sin separadores de miles.",
	),
	externalUrl: z.string().refine(
		(value) => InvoiceExternalUrlSchema.safeParse(value).success,
		"Ingresá un enlace HTTP(S) completo, sin credenciales y de hasta 2048 caracteres.",
	),
	sourceSystem: z.string().refine(
		(value) => InvoiceSourceSystemSchema.safeParse(value).success,
		"El sistema de origen puede tener hasta 100 caracteres.",
	),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export function createInvoiceFormDefaults(
	acceptedCustomerTotal: string | null,
	issuedOn: string,
): InvoiceFormValues {
	const amount = InvoiceAmountSchema.safeParse(acceptedCustomerTotal);
	return {
		reference: "",
		issuedOn,
		amount: amount.success ? amount.data : "",
		externalUrl: "",
		sourceSystem: "",
	};
}

export function toRegisterExternalInvoiceBody(
	rentalId: string,
	values: InvoiceFormValues,
): RegisterExternalInvoiceBodyDto {
	const parsed = invoiceFormSchema.parse(values);
	return RegisterExternalInvoiceBodySchema.parse({
		rentalId,
		reference: parsed.reference,
		issuedOn: parsed.issuedOn,
		amount: normalizeInvoiceAmountInput(parsed.amount),
		externalUrl: emptyToNull(parsed.externalUrl),
		sourceSystem: emptyToNull(parsed.sourceSystem),
	});
}
