import {
	type CorrectInvoiceRegistrationBodyDto,
	CorrectInvoiceRegistrationBodySchema,
	InvoiceAmountSchema,
	type InvoiceDto,
	InvoiceExternalUrlSchema,
	InvoiceReferenceSchema,
	InvoiceRegistrationFieldsSchema,
	InvoiceSourceSystemSchema,
	LocalDateSchema,
	type RegisterExternalInvoiceBodyDto,
	RegisterExternalInvoiceBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import {
	decimalsEqual,
	parsePlainDecimal,
} from "@/shared/utils/decimal-string";
import { emptyToNull } from "@/shared/utils/form.utils";

function normalizeInvoiceAmountInput(value: string): string {
	return value.trim().replace(",", ".");
}

export const invoiceFormSchema = z.object({
	reference: z
		.string()
		.refine(
			(value) => InvoiceReferenceSchema.safeParse(value).success,
			"Ingresá una referencia de hasta 255 caracteres.",
		),
	issuedOn: z
		.string()
		.refine(
			(value) => LocalDateSchema.safeParse(value).success,
			"Ingresá una fecha de emisión válida.",
		),
	amount: z
		.string()
		.refine(
			(value) =>
				InvoiceAmountSchema.safeParse(normalizeInvoiceAmountInput(value))
					.success,
			"Ingresá un importe mayor a cero, con hasta 15 dígitos enteros y 4 decimales, sin separadores de miles.",
		),
	externalUrl: z
		.string()
		.refine(
			(value) => InvoiceExternalUrlSchema.safeParse(value).success,
			"Ingresá un enlace HTTP(S) completo, sin credenciales y de hasta 2048 caracteres.",
		),
	sourceSystem: z
		.string()
		.refine(
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

function toInvoiceRegistrationFields(values: InvoiceFormValues) {
	const parsed = invoiceFormSchema.parse(values);
	return InvoiceRegistrationFieldsSchema.parse({
		...parsed,
		amount: normalizeInvoiceAmountInput(parsed.amount),
		externalUrl: emptyToNull(parsed.externalUrl),
		sourceSystem: emptyToNull(parsed.sourceSystem),
	});
}

export function toRegisterExternalInvoiceBody(
	rentalId: string,
	values: InvoiceFormValues,
): RegisterExternalInvoiceBodyDto {
	return RegisterExternalInvoiceBodySchema.parse({
		rentalId,
		...toInvoiceRegistrationFields(values),
	});
}

export function invoiceToFormValues(invoice: InvoiceDto): InvoiceFormValues {
	return {
		reference: invoice.reference,
		issuedOn: invoice.issuedOn,
		amount: invoice.amount,
		externalUrl: invoice.externalUrl ?? "",
		sourceSystem: invoice.sourceSystem ?? "",
	};
}

export function toCorrectInvoiceRegistrationBody(
	invoice: InvoiceDto,
	values: InvoiceFormValues,
): CorrectInvoiceRegistrationBodyDto | null {
	const fields = toInvoiceRegistrationFields(values);
	const body: CorrectInvoiceRegistrationBodyDto = {
		expectedVersion: invoice.version,
	};
	if (fields.reference !== invoice.reference) body.reference = fields.reference;
	if (fields.issuedOn !== invoice.issuedOn) body.issuedOn = fields.issuedOn;
	const amount = parsePlainDecimal(fields.amount);
	const originalAmount = parsePlainDecimal(invoice.amount);
	if (!amount || !originalAmount || !decimalsEqual(amount, originalAmount)) {
		body.amount = fields.amount;
	}
	if (fields.externalUrl !== invoice.externalUrl) {
		body.externalUrl = fields.externalUrl;
	}
	if (fields.sourceSystem !== invoice.sourceSystem) {
		body.sourceSystem = fields.sourceSystem;
	}
	// expectedVersion alone is not an update, including equivalent decimals.
	if (Object.keys(body).length === 1) return null;
	return CorrectInvoiceRegistrationBodySchema.parse(body);
}

export function hasInvoiceRegistrationChanges(
	invoice: InvoiceDto,
	values: InvoiceFormValues,
): boolean {
	// Invalid edits must still allow submit-time field validation to run.
	if (!invoiceFormSchema.safeParse(values).success) return true;
	return toCorrectInvoiceRegistrationBody(invoice, values) !== null;
}
