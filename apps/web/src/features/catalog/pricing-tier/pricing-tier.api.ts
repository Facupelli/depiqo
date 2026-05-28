import {
	type SetPricingTiersDto,
	setPricingTiersBodySchema,
} from "@repo/schemas";
import { createServerFn } from "@tanstack/react-start";
import { authenticatedApiFetch as apiFetch } from "@/lib/api-auth";

const apiUrl = "/pricing-tiers";

export const setPricingTiers = createServerFn({ method: "POST" })
	.inputValidator((data: SetPricingTiersDto) =>
		setPricingTiersBodySchema.parse(data),
	)
	.handler(async ({ data }): Promise<string> => {
		const result = await apiFetch<string>(apiUrl, {
			method: "POST",
			body: data,
		});

		return result;
	});
