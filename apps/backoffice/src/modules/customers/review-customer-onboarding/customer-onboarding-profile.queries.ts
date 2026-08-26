import type { GetCustomerProfileDetailResponseDto } from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { customerKeys } from "../customer.query-keys";
import { getCustomerProfileDetail } from "./customer-onboarding-profile.api";

export type CustomerOnboardingProfileQueryOverrides<
	TData = GetCustomerProfileDetailResponseDto,
> = Omit<
	UseQueryOptions<
		GetCustomerProfileDetailResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

export const customerOnboardingProfileQueries = {
	detail: <TData = GetCustomerProfileDetailResponseDto>(
		customerId?: string,
		overrides?: CustomerOnboardingProfileQueryOverrides<TData>,
	) =>
		queryOptions<
			GetCustomerProfileDetailResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: customerKeys.profileDetail(customerId),
			queryFn: () => {
				if (!customerId) {
					throw new Error(
						"customerId is required to fetch customer profile detail.",
					);
				}

				return getCustomerProfileDetail(customerId);
			},
			enabled: !!customerId,
			...overrides,
		}),
};

export function useCustomerOnboardingProfile<
	TData = GetCustomerProfileDetailResponseDto,
>(
	customerId?: string,
	overrides?: CustomerOnboardingProfileQueryOverrides<TData>,
) {
	return useQuery(
		customerOnboardingProfileQueries.detail(customerId, overrides),
	);
}
