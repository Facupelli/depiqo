import {
	type CustomerProfileDetailProfileDto,
	LocalDateSchema,
	type SubmitCustomerProfileBodyDto,
	SubmitCustomerProfileBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

const phoneSchema = z
	.string()
	.min(7, "Ingresá un número de teléfono válido")
	.regex(
		/^\+?[\d\s\-().]{7,20}$/,
		"Formato inválido. Incluí el código de área",
	);

const optionalPhoneSchema = z
	.string()
	.refine(
		(value) => !value || /^\+?[\d\s\-().]{7,20}$/.test(value),
		"Formato inválido. Incluí el código de área",
	);

export const customerOnboardingStepSchemas = {
	1: z.object({
		fullName: z.string().min(2, "Ingresá tu nombre completo"),
		phone: phoneSchema,
		birthDate: LocalDateSchema,
		documentNumber: z
			.string()
			.min(5, "Ingresá tu DNI o NIE")
			.regex(/^[A-Za-z0-9]+$/, "Usá solo letras y números, sin espacios"),
	}),
	2: z
		.object({
			identityDocumentFile: z.instanceof(File).nullable(),
			currentIdentityDocumentPath: z.string().min(1).nullable(),
			address: z.string().min(4, "Ingresá tu domicilio"),
			city: z.string().min(2, "Ingresá tu localidad"),
			stateRegion: z.string().min(2, "Ingresá tu provincia o región"),
			country: z.string().min(2, "Ingresá tu país"),
		})
		.superRefine((data, context) => {
			if (!data.identityDocumentFile && !data.currentIdentityDocumentPath) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["identityDocumentFile"],
					message: "Subí tu documento",
				});
			}
		}),
	3: z.object({
		occupation: z.string(),
		company: z.string(),
		taxId: z.string(),
		businessName: z.string(),
	}),
	4: z
		.object({
			instagram: z.string(),
			knowsExistingCustomer: z.boolean(),
			knownCustomerName: z.string(),
		})
		.superRefine((data, context) => {
			if (data.knowsExistingCustomer && !data.knownCustomerName.trim()) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["knownCustomerName"],
					message: "Ingresá el nombre de la persona que conocés",
				});
			}
		}),
	5: z
		.object({
			contact1Name: z.string().min(2, "Ingresá el nombre del contacto"),
			contact1Phone: phoneSchema,
			contact1Relationship: z.string().min(2, "Ingresá el vínculo"),
			contact2Name: z.string(),
			contact2Phone: optionalPhoneSchema,
			contact2Relationship: z.string(),
		})
		.superRefine((data, context) => {
			const hasName = Boolean(data.contact2Name.trim());
			const hasPhone = Boolean(data.contact2Phone.trim());
			const hasRelationship = Boolean(data.contact2Relationship.trim());

			if (hasName || hasPhone || hasRelationship) {
				if (!hasName) {
					context.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["contact2Name"],
						message: "Ingresá el nombre del segundo contacto",
					});
				}
				if (!hasPhone) {
					context.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["contact2Phone"],
						message: "Ingresá el teléfono del segundo contacto",
					});
				}
				if (!hasRelationship) {
					context.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["contact2Relationship"],
						message: "Ingresá el vínculo del segundo contacto",
					});
				}
			}
		}),
} as const;

export const customerOnboardingFormSchema = customerOnboardingStepSchemas[1]
	.extend(customerOnboardingStepSchemas[2].shape)
	.extend(customerOnboardingStepSchemas[3].shape)
	.extend(customerOnboardingStepSchemas[4].shape)
	.extend(customerOnboardingStepSchemas[5].shape)
	.superRefine((data, context) => {
		for (const schema of Object.values(customerOnboardingStepSchemas)) {
			const result = schema.safeParse(data);
			if (!result.success) {
				for (const issue of result.error.issues) {
					context.addIssue({
						code: z.ZodIssueCode.custom,
						path: issue.path,
						message: issue.message,
					});
				}
			}
		}
	});

export type CustomerOnboardingFormValues = z.infer<
	typeof customerOnboardingFormSchema
>;

export function createCustomerOnboardingFormDefaults(
	overrides: Partial<CustomerOnboardingFormValues> = {},
): CustomerOnboardingFormValues {
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

export function fromCustomerProfileToOnboardingFormValues(
	profile: CustomerProfileDetailProfileDto,
): CustomerOnboardingFormValues {
	return createCustomerOnboardingFormDefaults({
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
	values: CustomerOnboardingFormValues,
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
		instagram: emptyToUndefined(normalizeInstagramUsername(values.instagram)),
		knowsExistingCustomer: values.knowsExistingCustomer,
		knownCustomerName: values.knowsExistingCustomer
			? emptyToUndefined(values.knownCustomerName)
			: undefined,
		contact1Name: values.contact1Name.trim(),
		contact1Phone: values.contact1Phone.trim(),
		contact1Relationship: values.contact1Relationship.trim(),
		contact2Name: values.contact2Name.trim(),
		contact2Phone: values.contact2Phone.trim(),
		contact2Relationship: values.contact2Relationship.trim(),
	});
}

function emptyToUndefined(value: string) {
	const trimmedValue = value.trim();
	return trimmedValue || undefined;
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
