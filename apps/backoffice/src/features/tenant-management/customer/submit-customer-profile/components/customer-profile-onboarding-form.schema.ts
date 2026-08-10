import {
	type CustomerProfileDetailProfileDto,
	type SubmitCustomerProfileBodyDto,
	LocalDateSchema,
	SubmitCustomerProfileBodySchema,
} from "@repo/api-contracts";
import z from "zod";

const optionalPhoneSchema = z
	.string()
	.optional()
	.refine(
		(value) => !value || /^\+?[\d\s\-().]{7,20}$/.test(value),
		"Formato inválido. Incluí el código de área",
	);

const step1BaseSchema = z.object({
	fullName: z.string().min(2, "Ingresá tu nombre completo"),
	phone: z
		.string()
		.min(7, "Ingresá un número de teléfono válido")
		.regex(
			/^\+?[\d\s\-().]{7,20}$/,
			"Formato inválido. Incluí el código de área",
		),
	birthDate: LocalDateSchema,
	documentNumber: z
		.string()
		.min(5, "Ingresá tu DNI o NIE")
		.regex(/^[A-Za-z0-9]+$/, "Usá solo letras y números, sin espacios"),
});

const step2BaseSchema = z.object({
	identityDocumentFile: z.instanceof(File).nullable(),
	currentIdentityDocumentPath: z.string().min(1).nullable(),
	address: z.string().min(4, "Ingresá tu domicilio"),
	city: z.string().min(2, "Ingresá tu localidad"),
	stateRegion: z.string().min(2, "Ingresá tu provincia o región"),
	country: z.string().min(2, "Ingresá tu país"),
});

const step3BaseSchema = z.object({
	occupation: z.string(),
	company: z.string(),
	taxId: z.string(),
	businessName: z.string(),
	bankName: z.string(),
	accountNumber: z.string(),
});

const step4BaseSchema = z.object({
	instagram: z.string(),
	knowsExistingCustomer: z.boolean(),
	knownCustomerName: z.string(),
});

const step5BaseSchema = z.object({
	contact1Name: z.string().min(2, "Ingresá el nombre del contacto"),
	contact1Phone: z
		.string()
		.min(7, "Ingresá un número de teléfono válido")
		.regex(
			/^\+?[\d\s\-().]{7,20}$/,
			"Formato inválido. Incluí el código de área",
		),
	contact1Relationship: z.string().min(2, "Ingresá el vínculo"),
	contact2Name: z.string(),
	contact2Phone: optionalPhoneSchema,
	contact2Relationship: z.string(),
});

function validateIdentityDocument(
	data: z.infer<typeof step2BaseSchema>,
	ctx: z.RefinementCtx,
) {
	if (data.identityDocumentFile || data.currentIdentityDocumentPath) {
		return;
	}

	ctx.addIssue({
		code: z.ZodIssueCode.custom,
		path: ["identityDocumentFile"],
		message: "Subí tu documento",
	});
}

function validateKnownCustomer(
	data: z.infer<typeof step4BaseSchema>,
	ctx: z.RefinementCtx,
) {
	if (data.knowsExistingCustomer && !data.knownCustomerName.trim()) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["knownCustomerName"],
			message: "Ingresá el nombre de la persona que conocés",
		});
	}
}

function validateSecondContact(
	data: z.infer<typeof step5BaseSchema>,
	ctx: z.RefinementCtx,
) {
	const hasName = data.contact2Name.trim().length > 0;
	const hasPhone = (data.contact2Phone ?? "").trim().length > 0;
	const hasRel = data.contact2Relationship.trim().length > 0;

	if (hasName && !hasRel) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["contact2Relationship"],
			message: "Ingresá el vínculo del segundo contacto",
		});
	}
	if (hasName && !hasPhone) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["contact2Phone"],
			message: "Ingresá el teléfono del segundo contacto",
		});
	}
	if (hasRel && !hasName) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["contact2Name"],
			message: "Ingresá el nombre del segundo contacto",
		});
	}
	if (hasRel && !hasPhone) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["contact2Phone"],
			message: "Ingresá el teléfono del segundo contacto",
		});
	}
	if (hasPhone && !hasName) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["contact2Name"],
			message: "Ingresá el nombre del segundo contacto",
		});
	}
	if (hasPhone && !hasRel) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["contact2Relationship"],
			message: "Ingresá el vínculo del segundo contacto",
		});
	}
}

export const step1Schema = step1BaseSchema;
export const step2Schema = step2BaseSchema.superRefine(
	validateIdentityDocument,
);
export const step3Schema = step3BaseSchema;
export const step4Schema = step4BaseSchema.superRefine(validateKnownCustomer);
export const step5Schema = step5BaseSchema.superRefine(validateSecondContact);

export const customerProfileOnboardingSubmitSchema = step1BaseSchema
	.extend(step2BaseSchema.shape)
	.extend(step3BaseSchema.shape)
	.extend(step4BaseSchema.shape)
	.extend(step5BaseSchema.shape)
	.superRefine(validateIdentityDocument)
	.superRefine(validateKnownCustomer)
	.superRefine(validateSecondContact);

export const customerProfileOnboardingFormSchema =
	customerProfileOnboardingSubmitSchema;

export type CustomerProfileOnboardingFormValues = z.infer<
	typeof customerProfileOnboardingFormSchema
>;

export interface CustomerProfileOnboardingPrefillValues
	extends Omit<CustomerProfileOnboardingFormValues, "identityDocumentFile"> {}

export function customerProfileOnboardingFormDefaultValues(
	overrides: Partial<CustomerProfileOnboardingFormValues> = {},
): CustomerProfileOnboardingFormValues {
	return {
		fullName: "",
		phone: "",
		birthDate: "",
		documentNumber: "",
		identityDocumentFile: null,
		currentIdentityDocumentPath: null,
		address: "",
		city: "",
		stateRegion: "",
		country: "",
		occupation: "",
		company: "",
		taxId: "",
		businessName: "",
		bankName: "",
		accountNumber: "",
		instagram: "",
		knowsExistingCustomer: false,
		knownCustomerName: "",
		contact1Name: "",
		contact1Phone: "",
		contact1Relationship: "",
		contact2Name: "",
		contact2Phone: "",
		contact2Relationship: "",
		...overrides,
	};
}

export function createCustomerProfileOnboardingPrefillValues(
	overrides: Partial<CustomerProfileOnboardingPrefillValues> = {},
): CustomerProfileOnboardingPrefillValues {
	const { identityDocumentFile: _identityDocumentFile, ...prefillValues } =
		customerProfileOnboardingFormDefaultValues();

	return {
		...prefillValues,
		...overrides,
	};
}

export function toCustomerProfileOnboardingFormValues(
	prefillValues: CustomerProfileOnboardingPrefillValues,
): CustomerProfileOnboardingFormValues {
	return customerProfileOnboardingFormDefaultValues({
		...prefillValues,
		identityDocumentFile: null,
	});
}

export function fromCustomerProfileDetailToOnboardingPrefillValues(
	profile: CustomerProfileDetailProfileDto,
): CustomerProfileOnboardingPrefillValues {
	return createCustomerProfileOnboardingPrefillValues({
		fullName: profile.fullName,
		phone: profile.phone,
		birthDate: profile.birthDate,
		documentNumber: profile.documentNumber,
		currentIdentityDocumentPath: profile.identityDocumentPath,
		address: profile.address,
		city: profile.city,
		stateRegion: profile.stateRegion,
		country: profile.country,
		occupation: profile.occupation,
		company: profile.company ?? "",
		taxId: profile.taxId ?? "",
		businessName: profile.businessName ?? "",
		bankName: profile.bankName,
		accountNumber: profile.accountNumber,
		instagram: profile.instagram ?? "",
		knowsExistingCustomer: profile.knowsExistingCustomer,
		knownCustomerName: profile.knownCustomerName ?? "",
		contact1Name: profile.contact1Name,
		contact1Phone: profile.contact1Phone,
		contact1Relationship: profile.contact1Relationship,
		contact2Name: profile.contact2Name,
		contact2Phone: profile.contact2Phone,
		contact2Relationship: profile.contact2Relationship,
	});
}

export function toSubmitCustomerProfileDto(
	values: CustomerProfileOnboardingFormValues,
	identityDocumentPath: string,
): SubmitCustomerProfileBodyDto {
	return SubmitCustomerProfileBodySchema.parse({
		fullName: values.fullName.trim(),
		phone: values.phone.trim(),
		birthDate: values.birthDate,
		documentNumber: values.documentNumber.trim(),
		identityDocumentPath,
		address: values.address.trim(),
		city: values.city.trim(),
		stateRegion: values.stateRegion.trim(),
		country: values.country.trim(),
		occupation: values.occupation.trim(),
		company: emptyToUndefined(values.company),
		taxId: emptyToUndefined(values.taxId),
		businessName: emptyToUndefined(values.businessName),
		bankName: values.bankName.trim(),
		accountNumber: values.accountNumber.trim(),
		instagram: emptyToUndefined(normalizeInstagramUsername(values.instagram)),
		knowsExistingCustomer: values.knowsExistingCustomer,
		knownCustomerName: values.knowsExistingCustomer
			? emptyToUndefined(values.knownCustomerName)
			: undefined,
		contact1Name: values.contact1Name.trim(),
		contact1Phone: values.contact1Phone.trim(),
		contact1Relationship: values.contact1Relationship.trim(),
		contact2Name: values.contact2Name.trim(),
		contact2Phone: values.contact2Phone?.trim() ?? "",
		contact2Relationship: values.contact2Relationship.trim(),
	});
}

function emptyToUndefined(value: string) {
	const trimmedValue = value.trim();
	return trimmedValue ? trimmedValue : undefined;
}

function normalizeInstagramUsername(value: string) {
	const trimmedValue = value.trim();
	if (!trimmedValue) return "";

	const withoutProtocol = trimmedValue
		.replace(/^https?:\/\//i, "")
		.replace(/^www\./i, "");
	const withoutDomain = withoutProtocol.replace(/^instagram\.com\//i, "");
	const normalized = withoutDomain.replace(/^@/, "").replace(/\/$/, "");

	return normalized ? normalized.split("/")[0] : "";
}

export const stepFields = {
	1: ["fullName", "phone", "birthDate", "documentNumber"] as const,
	2: [
		"identityDocumentFile",
		"currentIdentityDocumentPath",
		"address",
		"city",
		"stateRegion",
		"country",
	] as const,
	3: [
		"occupation",
		"company",
		"taxId",
		"businessName",
		"bankName",
		"accountNumber",
	] as const,
	4: ["instagram", "knowsExistingCustomer", "knownCustomerName"] as const,
	5: [
		"contact1Name",
		"contact1Phone",
		"contact1Relationship",
		"contact2Name",
		"contact2Phone",
		"contact2Relationship",
	] as const,
} as const;

export type StepNumber = keyof typeof stepFields;
