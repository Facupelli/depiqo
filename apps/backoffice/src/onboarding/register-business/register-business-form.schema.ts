import {
	type RegisterTenantWithOwnerBodyDto,
	RegisterTenantWithOwnerBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const registerBusinessFormSchema = z.object({
	businessName: z.string().min(1, "Tenant name is required"),
	email: z.email("Invalid email"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
});

export type RegisterBusinessFormValues = z.infer<
	typeof registerBusinessFormSchema
>;

export const registerBusinessFormDefaults: RegisterBusinessFormValues = {
	businessName: "",
	email: "",
	password: "",
	firstName: "",
	lastName: "",
};

export function toRegisterBusinessDto(
	values: RegisterBusinessFormValues,
): RegisterTenantWithOwnerBodyDto {
	const dto = {
		tenant: {
			name: values.businessName.trim(),
		},
		owner: {
			name: `${values.firstName.trim()} ${values.lastName.trim()}`,
			email: values.email.trim(),
			password: values.password,
		},
	};

	return RegisterTenantWithOwnerBodySchema.parse(dto);
}
