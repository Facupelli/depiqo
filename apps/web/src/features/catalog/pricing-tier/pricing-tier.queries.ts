import type { SetPricingTiersDto } from "@repo/schemas";
import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { setPricingTiers } from "./pricing-tier.api";

type PricingTierMutationOptions = Omit<
	UseMutationOptions<string, ProblemDetailsError, SetPricingTiersDto>,
	"mutationFn"
>;

export function useSetPricingTiers(options?: PricingTierMutationOptions) {
	return useMutation<string, ProblemDetailsError, SetPricingTiersDto>({
		...options,
		mutationFn: (data) => setPricingTiers({ data }),
		meta: {
			invalidates: undefined, // TODO: replace with the correct query key once known
		},
	});
}
