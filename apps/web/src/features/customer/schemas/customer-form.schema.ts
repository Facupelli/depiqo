import {
	type CreateCustomerDto,
	type CustomerRegisterDto,
	createCustomerSchema,
	customerRegisterSchema,
	type UpdateCustomerDto,
	updateCustomerSchema,
} from "@repo/schemas";
import { z } from "zod";
import { emptyToNull, emptyToNullOrUndefined } from "@/shared/utils/form.utils";

const customerFieldsFormSchema = {
	email: z.email("Invalid email"),
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	phone: z.string().or(z.literal("")),
	isCompany: z.boolean(),
	companyName: z.string().or(z.literal("")),
	taxId: z.string().or(z.literal("")),
};

const customerCompanyFormRefinement = (
	data: { isCompany?: boolean | null; companyName?: string },
	ctx: z.RefinementCtx,
) => {
	if (data.isCompany && (!data.companyName || data.companyName.trim() === "")) {
		ctx.addIssue({
			code: "custom",
			message: "Company name is required for company accounts",
			path: ["companyName"],
		});
	}
};

// ---------------------------------------------------------------------------
// REGISTER FORM
// ---------------------------------------------------------------------------

export const customerRegisterFormSchema = z
	.object({
		...customerFieldsFormSchema,
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string(),
	})
	.superRefine(customerCompanyFormRefinement)
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export type CustomerRegisterFormValues = z.infer<
	typeof customerRegisterFormSchema
>;

export const customerRegisterFormDefaults: CustomerRegisterFormValues = {
	email: "",
	password: "",
	confirmPassword: "",
	firstName: "",
	lastName: "",
	phone: "",
	isCompany: false,
	companyName: "",
	taxId: "",
};

export function toCustomerRegisterDto(
	values: CustomerRegisterFormValues,
): CustomerRegisterDto {
	const dto = {
		email: values.email.trim(),
		password: values.password,
		firstName: values.firstName.trim(),
		lastName: values.lastName.trim(),
		phone: emptyToNull(values.phone),
		isCompany: values.isCompany,
		companyName: emptyToNull(values.companyName),
		taxId: emptyToNull(values.taxId),
	};

	return customerRegisterSchema.parse(dto);
}

// ---------------------------------------------------------------------------
// BACK-OFFICE CREATE FORM
// ---------------------------------------------------------------------------

export const createCustomerFormSchema = z
	.object(customerFieldsFormSchema)
	.superRefine(customerCompanyFormRefinement);

export type CreateCustomerFormValues = z.infer<typeof createCustomerFormSchema>;

export const createCustomerFormDefaults: CreateCustomerFormValues = {
	email: "",
	firstName: "",
	lastName: "",
	phone: "",
	isCompany: false,
	companyName: "",
	taxId: "",
};

export function toCreateCustomerDto(
	values: CreateCustomerFormValues,
): CreateCustomerDto {
	const dto = {
		email: values.email.trim(),
		password: crypto.randomUUID(),
		firstName: values.firstName.trim(),
		lastName: values.lastName.trim(),
		phone: emptyToNull(values.phone),
		isCompany: values.isCompany,
		companyName: emptyToNull(values.companyName),
		taxId: emptyToNull(values.taxId),
	};

	return createCustomerSchema.parse(dto);
}

// ---------------------------------------------------------------------------
// EDIT FORM
// ---------------------------------------------------------------------------

export const updateCustomerFormSchema = z
	.object({
		email: z.email("Invalid email"),
		firstName: z.string().min(1, "First name is required"),
		lastName: z.string().min(1, "Last name is required"),
		phone: z.string().or(z.literal("")),
		isCompany: z.boolean(),
		companyName: z.string().or(z.literal("")),
		taxId: z.string().or(z.literal("")),
	})
	.superRefine(customerCompanyFormRefinement);

export type UpdateCustomerFormValues = z.infer<typeof updateCustomerFormSchema>;

export function customerToFormValues(customer: {
	email: string;
	firstName: string;
	lastName: string;
	phone: string | null;
	isCompany: boolean;
	companyName: string | null;
	taxId: string | null;
}): UpdateCustomerFormValues {
	return {
		email: customer.email,
		firstName: customer.firstName,
		lastName: customer.lastName,
		phone: customer.phone ?? "",
		isCompany: customer.isCompany,
		companyName: customer.companyName ?? "",
		taxId: customer.taxId ?? "",
	};
}

export function toUpdateCustomerDto(
	dirtyValues: Partial<UpdateCustomerFormValues>,
): UpdateCustomerDto {
	const dto: UpdateCustomerDto = {};

	if (dirtyValues.email !== undefined) {
		dto.email = dirtyValues.email.trim();
	}
	if (dirtyValues.firstName !== undefined) {
		dto.firstName = dirtyValues.firstName.trim();
	}
	if (dirtyValues.lastName !== undefined) {
		dto.lastName = dirtyValues.lastName.trim();
	}
	if (dirtyValues.phone !== undefined) {
		dto.phone = emptyToNullOrUndefined(dirtyValues.phone);
	}
	if (dirtyValues.isCompany !== undefined) {
		dto.isCompany = dirtyValues.isCompany;
	}
	if (dirtyValues.companyName !== undefined) {
		dto.companyName = emptyToNullOrUndefined(dirtyValues.companyName);
	}
	if (dirtyValues.taxId !== undefined) {
		dto.taxId = emptyToNullOrUndefined(dirtyValues.taxId);
	}

	return updateCustomerSchema.parse(dto);
}
