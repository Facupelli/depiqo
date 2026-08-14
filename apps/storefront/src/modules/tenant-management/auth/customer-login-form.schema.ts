import {
	type CustomerLoginBodyDto,
	CustomerLoginBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const customerLoginFormSchema = z.object({
	email: z.email("Ingresa un correo electrónico válido."),
	password: z.string().min(1, "La contraseña es obligatoria."),
});

export type CustomerLoginFormValues = z.infer<typeof customerLoginFormSchema>;

export function createCustomerLoginFormDefaults(): CustomerLoginFormValues {
	return { email: "", password: "" };
}

export function toCustomerLoginDto(
	values: CustomerLoginFormValues,
): CustomerLoginBodyDto {
	return CustomerLoginBodySchema.parse({
		email: values.email.trim(),
		password: values.password,
	});
}
