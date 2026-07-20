import z from "zod";

export const customerLoginSchema = z.object({
	email: z.email("Please enter a valid email address."),
	password: z
		.string()
		.min(1, "Password is required.")
		.min(8, "Password must be at least 8 characters."),
});

export type CustomerLoginFormValues = z.infer<typeof customerLoginSchema>;
export type LoginCustomerInput = CustomerLoginFormValues;

export const loginCustomerFormDefaults: CustomerLoginFormValues = {
	email: "",
	password: "",
};
