import { CustomerGoogleStateBodySchema } from "@repo/api-contracts";
import { createServerFn } from "@tanstack/react-start";
import { createCustomerGoogleState } from "./customer-google-state.api";

export const createCustomerGoogleStateFn = createServerFn({
	method: "POST",
})
	.inputValidator((data) => CustomerGoogleStateBodySchema.parse(data))
	.handler(async ({ data }) => createCustomerGoogleState({ body: data }));
