import {
	type CustomerProfile,
	type CustomerProfileLeadSource,
	type CustomerProfileResponseDto,
	customerProfileLeadSourceSchema,
	customerProfileSchema,
} from "@repo/schemas";
import z from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

export const CUSTOMER_PROFILE_LEAD_SOURCE_LABELS: Record<
	CustomerProfileLeadSource,
	string
> = {
	INSTAGRAM: "Instagram",
	FACEBOOK: "Facebook",
	GOOGLE: "Google",
	TIKTOK: "TikTok",
	REFERRAL: "Amigo / referido",
	EVENT: "Evento",
	REPEAT_CUSTOMER: "Ya fui cliente",
	OTHER: "Otro",
};

export const CUSTOMER_PROFILE_LEAD_SOURCE_OPTIONS =
	customerProfileLeadSourceSchema.options;

const optionalPhoneSchema = z
	.string()
	.optional()
	.refine(
		(value) => !value || /^\+?[\d\s\-().]{7,20}$/.test(value),
		"Formato inválido. Incluí el código de área",
	);

export const step1Schema = z.object({
	fullName: z.string().min(2, "Ingresá tu nombre completo"),
	phone: z
		.string()
		.min(7, "Ingresá un número de teléfono válido")
		.regex(
			/^\+?[\d\s\-().]{7,20}$/,
			"Formato inválido. Incluí el código de área",
		),
	birthDate: z.string().min(1, "Ingresá tu fecha de nacimiento"),
	documentNumber: z
		.string()
		.min(5, "Ingresá tu DNI o NIE")
		.regex(/^[A-Za-z0-9]+$/, "Usá solo letras y números, sin espacios"),
});

export const step2Schema = z
	.object({
		identityDocumentFile: z.instanceof(File).nullable(),
		currentIdentityDocumentPath: z.string().min(1).nullable(),
		address: z.string().min(4, "Ingresá tu domicilio"),
		city: z.string().min(2, "Ingresá tu localidad"),
		stateRegion: z.string().min(2, "Ingresá tu provincia o región"),
		country: z.string().min(2, "Ingresá tu país"),
	})
	.superRefine((data, ctx) => {
		if (data.identityDocumentFile || data.currentIdentityDocumentPath) {
			return;
		}

		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["identityDocumentFile"],
			message: "Subí tu documento",
		});
	});

export const step3Schema = z.object({
	occupation: z.string().optional(),
	company: z.string().optional(),
	taxId: z.string().optional(),
	businessName: z.string().optional(),
	bankName: z.string().optional(),
	accountNumber: z.string().optional(),
});

export const step4Schema = z
	.object({
		instagram: z.string().trim().min(1, "Ingresá tu usuario de Instagram"),
		knowsExistingCustomer: z.boolean(),
		knownCustomerName: z.string().optional(),
		heardAboutUs: customerProfileLeadSourceSchema,
		heardAboutUsOther: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.knowsExistingCustomer && !(data.knownCustomerName ?? "").trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["knownCustomerName"],
				message: "Ingresá el nombre de la persona que conocés",
			});
		}

		if (
			data.heardAboutUs === "OTHER" &&
			!(data.heardAboutUsOther ?? "").trim()
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["heardAboutUsOther"],
				message: "Contanos dónde nos conociste",
			});
		}
	});

// Contact 2 fields are optional, but must be filled together (both or neither)
export const step5Schema = z
	.object({
		contact1Name: z.string().min(2, "Ingresá el nombre del contacto"),
		contact1Phone: z
			.string()
			.min(7, "Ingresá un número de teléfono válido")
			.regex(
				/^\+?[\d\s\-().]{7,20}$/,
				"Formato inválido. Incluí el código de área",
			),
		contact1Relationship: z.string().min(2, "Ingresá el vínculo"),
		contact2Name: z.string().optional(),
		contact2Phone: optionalPhoneSchema,
		contact2Relationship: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		const hasName = (data.contact2Name ?? "").trim().length > 0;
		const hasPhone = (data.contact2Phone ?? "").trim().length > 0;
		const hasRel = (data.contact2Relationship ?? "").trim().length > 0;

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
	});

export const customerFormFieldSchema = step1Schema
	.extend(step2Schema.shape)
	.extend(step3Schema.shape)
	.extend(step4Schema.shape)
	.extend(step5Schema.shape);

// ---------------------------------------------------------------------------
// Full form submit schema — submit-only cross-field validations
// ---------------------------------------------------------------------------
export const customerFormSubmitSchema = z
	.object({
		identityDocumentFile: z.instanceof(File).nullable(),
		currentIdentityDocumentPath: z.string().nullable(),
		instagram: z.string().trim().min(1, "Ingresá tu usuario de Instagram"),
		knowsExistingCustomer: z.boolean(),
		knownCustomerName: z.string().optional(),
		heardAboutUs: customerProfileLeadSourceSchema,
		heardAboutUsOther: z.string().optional(),
		contact2Name: z.string().optional(),
		contact2Phone: optionalPhoneSchema,
		contact2Relationship: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		const hasName = (data.contact2Name ?? "").trim().length > 0;
		const hasPhone = (data.contact2Phone ?? "").trim().length > 0;
		const hasRel = (data.contact2Relationship ?? "").trim().length > 0;

		if (hasName && !hasRel) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["contact2Relationship"],
				message: "Ingresá el vínculo del segundo contacto",
			});
		}

		if (hasRel && !hasName) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["contact2Name"],
				message: "Ingresá el nombre del segundo contacto",
			});
		}

		if (hasName && !hasPhone) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["contact2Phone"],
				message: "Ingresá el teléfono del segundo contacto",
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

		if (data.knowsExistingCustomer && !(data.knownCustomerName ?? "").trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["knownCustomerName"],
				message: "Ingresá el nombre de la persona que conocés",
			});
		}

		if (
			data.heardAboutUs === "OTHER" &&
			!(data.heardAboutUsOther ?? "").trim()
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["heardAboutUsOther"],
				message: "Contanos dónde nos conociste",
			});
		}

		if (!data.identityDocumentFile && !data.currentIdentityDocumentPath) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["identityDocumentFile"],
				message: "Subí tu documento",
			});
		}
	});

export type OnboardFormValues = z.infer<typeof customerFormFieldSchema>;

export interface OnboardPrefillValues {
	fullName: string;
	phone: string;
	birthDate: string;
	documentNumber: string;
	currentIdentityDocumentPath: string | null;
	address: string;
	city: string;
	stateRegion: string;
	country: string;
	occupation?: string;
	company?: string;
	taxId?: string;
	businessName?: string;
	bankName?: string;
	accountNumber?: string;
	instagram?: string;
	knowsExistingCustomer: boolean;
	knownCustomerName?: string;
	heardAboutUs: CustomerProfileLeadSource;
	heardAboutUsOther?: string;
	contact1Name: string;
	contact1Phone: string;
	contact1Relationship: string;
	contact2Name?: string;
	contact2Phone?: string;
	contact2Relationship?: string;
}

export const customerFormValues: OnboardFormValues = {
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
	heardAboutUs: "INSTAGRAM",
	heardAboutUsOther: "",
	contact1Name: "",
	contact1Phone: "",
	contact1Relationship: "",
	contact2Name: "",
	contact2Phone: "",
	contact2Relationship: "",
};

export function createOnboardFormValues(
	overrides: Partial<OnboardFormValues> = {},
): OnboardFormValues {
	return {
		...customerFormValues,
		...overrides,
	};
}

export function createOnboardPrefillValues(
	overrides: Partial<OnboardPrefillValues> = {},
): OnboardPrefillValues {
	const { identityDocumentFile: _identityDocumentFile, ...prefillValues } =
		customerFormValues;

	return {
		...prefillValues,
		...overrides,
	};
}

export function toOnboardFormValues(
	prefillValues: OnboardPrefillValues,
): OnboardFormValues {
	return createOnboardFormValues({
		...prefillValues,
		identityDocumentFile: null,
	});
}

export function toOnboardPrefillValues(
	profile: CustomerProfileResponseDto,
): OnboardPrefillValues {
	return createOnboardPrefillValues({
		fullName: profile.fullName,
		phone: profile.phone,
		birthDate: toIsoDateInputValue(profile.birthDate),
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
		heardAboutUs: profile.heardAboutUs,
		heardAboutUsOther: profile.heardAboutUsOther ?? "",
		contact1Name: profile.contact1Name,
		contact1Phone: profile.contact1Phone,
		contact1Relationship: profile.contact1Relationship,
		contact2Name: profile.contact2Name,
		contact2Phone: profile.contact2Phone,
		contact2Relationship: profile.contact2Relationship,
	});
}

function toIsoDateInputValue(value: Date | string) {
	const date = value instanceof Date ? value : new Date(value);

	return date.toISOString().slice(0, 10);
}

export function toCustomerProfileDto(
	values: OnboardFormValues,
	identityDocumentPath: string,
): CustomerProfile {
	return customerProfileSchema.parse({
		fullName: values.fullName.trim(),
		phone: values.phone.trim(),
		birthDate: values.birthDate,
		documentNumber: values.documentNumber.trim(),
		identityDocumentPath,
		address: values.address.trim(),
		city: values.city.trim(),
		stateRegion: values.stateRegion.trim(),
		country: values.country.trim(),
		occupation: values.occupation?.trim(),
		company: emptyToNull(values.company ?? ""),
		taxId: emptyToNull(values.taxId ?? ""),
		businessName: emptyToNull(values.businessName ?? ""),
		bankName: values.bankName?.trim(),
		accountNumber: values.accountNumber?.trim(),
		instagram: normalizeInstagramUsername(values.instagram ?? ""),
		knowsExistingCustomer: values.knowsExistingCustomer,
		knownCustomerName: values.knowsExistingCustomer
			? emptyToNull(values.knownCustomerName ?? "")
			: null,
		heardAboutUs: values.heardAboutUs,
		heardAboutUsOther:
			values.heardAboutUs === "OTHER"
				? emptyToNull(values.heardAboutUsOther ?? "")
				: null,
		contact1Name: values.contact1Name.trim(),
		contact1Phone: values.contact1Phone.trim(),
		contact1Relationship: values.contact1Relationship.trim(),
		contact2Name: values.contact2Name?.trim() ?? "",
		contact2Phone: values.contact2Phone?.trim() ?? "",
		contact2Relationship: values.contact2Relationship?.trim() ?? "",
	});
}

function normalizeInstagramUsername(value: string) {
	const trimmedValue = value.trim();

	if (!trimmedValue) {
		return null;
	}

	const withoutProtocol = trimmedValue
		.replace(/^https?:\/\//i, "")
		.replace(/^www\./i, "");
	const withoutDomain = withoutProtocol.replace(/^instagram\.com\//i, "");
	const normalized = withoutDomain.replace(/^@/, "").replace(/\/$/, "");

	return normalized ? normalized.split("/")[0] : null;
}

// ---------------------------------------------------------------------------
// Per-step field names — used to scope validation to the active step
// ---------------------------------------------------------------------------
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
	4: [
		"instagram",
		"knowsExistingCustomer",
		"knownCustomerName",
		"heardAboutUs",
		"heardAboutUsOther",
	] as const,
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
